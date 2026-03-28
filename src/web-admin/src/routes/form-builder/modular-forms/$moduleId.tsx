import AdminLayout from "@/components/AdminLayout";
import { useCustomAlert, useCustomConfirm } from "@/components/CustomAlert";
import { Form, FormProfileCondition } from "@/interfaces/interfaces";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/form-builder/modular-forms/$moduleId")({
  component: RouteComponent,
});

type FormStatus = "Private" | "Live" | "Scheduled" | "Unlocked" | "Locked";

function StatusPill({ status }: { status: FormStatus }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";

  const styles: Record<FormStatus, string> = {
    Private: "bg-gray-50 text-gray-700 border-gray-200",
    Live: "bg-green-50 text-green-700 border-green-200",
    Scheduled: "bg-amber-50 text-amber-800 border-amber-200",
    Unlocked: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Locked: "bg-red-50 text-red-700 border-red-200",
  };

  return <span className={`${base} ${styles[status]}`}>{status}</span>;
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
  faculty: "Faculty",
  program: "Program",
  isMcmasterStudent: "McMaster Student",
};

const FACULTY_OPTIONS = [
  "Engineering",
  "Science",
  "Business",
  "Humanities",
  "Social Sciences",
  "Health",
];

const PROGRAM_OPTIONS = [
  "Chemical Engineering",
  "Civil Engineering",
  "Computer Engineering",
  "Electrical Engineering",
  "Engineering Physics",
  "Materials Engineering",
  "Mechanical Engineering",
  "Software Engineering",
  "Mechatronics Engineering",
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Earth and Environmental Sciences",
  "Commerce",
  "Business Analytics",
  "Finance",
  "Marketing",
  "History",
  "Philosophy",
  "English",
  "Linguistics",
  "Economics",
  "Political Science",
  "Psychology",
  "Sociology",
  "Nursing",
  "Health Sciences",
  "Kinesiology",
  "Biochemistry",
];

const PROFILE_VALUE_OPTIONS: Record<
  "faculty" | "program" | "isMcmasterStudent",
  string[]
> = {
  faculty: FACULTY_OPTIONS,
  program: PROGRAM_OPTIONS,
  isMcmasterStudent: ["true", "false"],
};

const parseProfileConditionValues = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const getNowLocalDateTimeValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

function getFormStatus(form?: Form | null): FormStatus {
  if (!form?.isPublic) return "Private";

  if (!form.unlockAt) return "Live";

  const unlock = new Date(form.unlockAt).getTime();
  const now = Date.now();

  return unlock > now ? "Scheduled" : "Unlocked";
}

function RouteComponent() {
  const navigate = useNavigate();
  const showConfirm = useCustomConfirm();
  const { showAlert } = useCustomAlert();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [subForms, setSubForms] = useState<Form[]>([]);
  const { moduleId } = Route.useParams();
  const [formData, setFormData] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availableForms, setAvailableForms] = useState<Form[]>([]);
  const [selectedExistingFormId, setSelectedExistingFormId] =
    useState<string>("");
  const [loadingAvailableForms, setLoadingAvailableForms] = useState(false);
  const [attachingExisting, setAttachingExisting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const status = getFormStatus(formData);
  const [profileConditions, setProfileConditions] = useState<
    FormProfileCondition[]
  >([]);
  const [profileField, setProfileField] = useState<
    "faculty" | "program" | "isMcmasterStudent"
  >("faculty");
  const [selectedProfileValues, setSelectedProfileValues] = useState<string[]>(
    [],
  );
  const [isProfileAccessModalOpen, setIsProfileAccessModalOpen] =
    useState(false);
  const [isProfileValueDropdownOpen, setIsProfileValueDropdownOpen] =
    useState(false);
  const [savingProfileCondition, setSavingProfileCondition] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [unlockLocal, setUnlockLocal] = useState<string>("");
  const [savingUnlock, setSavingUnlock] = useState(false);
  const [isEditingUnlock, setIsEditingUnlock] = useState(false);
  const [unlockDraft, setUnlockDraft] = useState<string>("");
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaName, setMetaName] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileValueDropdownRef = useRef<HTMLDivElement>(null);
  const unlockInputRef = useRef<HTMLInputElement>(null);
  const choiceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    console.log("subforms updated:", subForms);
  }, [subForms]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const initAuth = () => {
      const sessionUser = getCurrentUser("admin");
      if (sessionUser) {
        if (sessionUser.roles && sessionUser.roles.includes("admin")) {
          setCurrentUser(sessionUser);
        } else {
          console.error("User does not have admin role");
          logout("admin");
          navigate({ to: "/" });
        }
      } else {
        navigate({ to: "/" });
      }
      setLoading(false);
    };

    initAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/mod-forms/${moduleId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch data");
        }
        setFormData(result.data);
        setMetaName(result.data?.name || "");
        setMetaDescription(result.data?.description || "");
        const u = result.data?.unlockAt ? new Date(result.data.unlockAt) : null;
        const local = u
          ? new Date(u.getTime() - u.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
          : "";
        setUnlockLocal(local);
        setUnlockDraft(local);
        setIsEditingUnlock(false);
        setIsEditingMeta(false);
        const profileConditionsResponse = await fetch(
          `/api/mod-forms/${moduleId}/profile-conditions`,
        );
        const profileConditionsResult = await profileConditionsResponse.json();
        if (profileConditionsResult.success) {
          setProfileConditions(profileConditionsResult.data || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, [moduleId]);

  useEffect(() => {
    fetchForms();
  }, []);

  const openProfileAccessModal = () => {
    loadProfileConditionDraft(profileField);
    setIsProfileValueDropdownOpen(false);
    setIsProfileAccessModalOpen(true);
  };

  const handleTogglePublic = async (nextValue: boolean) => {
    if (!formData) return;

    const prev = formData.isPublic;

    setFormData({ ...formData, isPublic: nextValue });
    setSavingVisibility(true);

    try {
      const res = await fetch(`/api/mod-forms/${moduleId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextValue }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.error || "Failed to update visibility");
      }

      setFormData(json.data);
      if (nextValue) {
        setIsEditingUnlock(false);
      }
    } catch (err: any) {
      // revert if it fails
      setFormData({ ...formData, isPublic: prev });
      showAlert(err?.message || "Failed to update visibility");
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleSaveUnlockAt = async (override?: string) => {
    if (!formData) return;

    if (formData.isPublic) {
      showAlert("Unpublish the form before setting an unlock date");
      return false;
    }

    const unlockInput = unlockInputRef.current;
    const value = override ?? unlockLocal;

    if (
      unlockInput &&
      value !== "" &&
      (!unlockInput.validity.valid || unlockInput.matches(":invalid"))
    ) {
      showAlert("Unlock date is invalid. Please fix it and try again.");
      unlockInput.focus();
      return false;
    }

    setSavingUnlock(true);
    try {
      if (value) {
        const parsedTime = new Date(value).getTime();

        if (Number.isNaN(parsedTime)) {
          showAlert("Unlock date is invalid. Please fix it and try again.");
          return false;
        }

        if (parsedTime < Date.now()) {
          showAlert(
            "Unlock date is invalid. Please choose a future date and time.",
          );
          return false;
        }
      }
      const nextUnlockAt = value ? new Date(value).toISOString() : null;
      const res = await fetch(`/api/mod-forms/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unlockAt: nextUnlockAt,
          isPublic: false,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || "Failed to update unlock date");
      }
      setFormData(json.data);
      setUnlockLocal(value || "");
      setUnlockDraft(value || "");
      return true;
    } catch (err: any) {
      showAlert(err?.message || "Failed to update unlock date");
      return false;
    } finally {
      setSavingUnlock(false);
    }
  };

  const loadProfileConditionDraft = (
    field: "faculty" | "program" | "isMcmasterStudent",
  ) => {
    const existingCondition = profileConditions.find(
      (condition) => condition.profileField === field,
    );

    const nextValues = existingCondition
      ? parseProfileConditionValues(existingCondition.expectedValue).filter(
          (value) => PROFILE_VALUE_OPTIONS[field].includes(value),
        )
      : [];

    setSelectedProfileValues(nextValues);
  };

  const closeProfileAccessModal = () => {
    setIsProfileValueDropdownOpen(false);
    setIsProfileAccessModalOpen(false);
  };

  const toggleProfileValue = (value: string) => {
    setSelectedProfileValues((prev) =>
      prev.includes(value)
        ? prev.filter((currentValue) => currentValue !== value)
        : [...prev, value],
    );
  };

  const handleSaveMeta = async () => {
    if (!formData) return;

    if (!metaName.trim()) {
      showAlert("Form title is required");
      return;
    }

    setSavingMeta(true);
    try {
      const res = await fetch(`/api/mod-forms/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: metaName.trim(),
          description: metaDescription.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || "Failed to update form details");
      }

      setFormData(json.data);
      setMetaName(json.data?.name || "");
      setMetaDescription(json.data?.description || "");
      setIsEditingMeta(false);
    } catch (err: any) {
      showAlert(err?.message || "Failed to update form details");
    } finally {
      setSavingMeta(false);
    }
  };

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const formsResponse = await fetch(`/api/mod-forms/sub-forms/${moduleId}`);

      if (!formsResponse.ok) {
        throw new Error("Failed to fetch forms");
      }

      const data = await formsResponse.json();
      if (data.success) {
        setSubForms(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch forms");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch forms");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableForms = async () => {
    try {
      setLoadingAvailableForms(true);
      const response = await fetch(`/api/forms`);

      if (!response.ok) {
        throw new Error("Failed to fetch available forms");
      }

      const data = await response.json();
      if (data.success) {
        setAvailableForms(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch available forms");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch available forms",
      );
    } finally {
      setLoadingAvailableForms(false);
    }
  };

  const openAddFormModal = async () => {
    if (formData?.isPublic) {
      showAlert("Unpublish the modular form before adding new forms");
      return;
    }

    setError(null);
    setNewFormName("");
    setNewFormDescription("");
    setSelectedExistingFormId("");
    setShowModal(true);
    await fetchAvailableForms();
  };

  const handleAddForm = async () => {
    if (formData?.isPublic) {
      setError("Unpublish the modular form before adding new forms");
      return;
    }

    if (!newFormName.trim()) {
      setError("Form name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFormName.trim(),
          description: newFormDescription.trim() || null,
          moduleId: moduleId,
          isPublic: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create form");
      }

      const data = await response.json();
      if (data.success) {
        setNewFormName("");
        setNewFormDescription("");
        setShowModal(false);
        // Refresh forms to ensure we have the latest data from the server
        await fetchForms();
      } else {
        throw new Error(data.error || "Failed to create form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create form");
      console.error("Create error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachExistingForm = async () => {
    if (formData?.isPublic) {
      setError("Unpublish the modular form before adding new forms");
      return;
    }

    if (!selectedExistingFormId) {
      setError("Select an existing form to attach");
      return;
    }

    try {
      setAttachingExisting(true);
      setError(null);

      const response = await fetch(`/api/forms/${selectedExistingFormId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moduleId: Number(moduleId),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to attach form");
      }

      setSelectedExistingFormId("");
      setShowModal(false);
      await Promise.all([fetchForms(), fetchAvailableForms()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach form");
    } finally {
      setAttachingExisting(false);
    }
  };

  const handleBackToForms = () => {
    navigate({ to: "/form-builder" });
  };

  const handleDeleteForm = async (id: number) => {
    const confirmed = await showConfirm(
      "Are you sure you want to delete this form?",
    );
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/forms/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete form");
      }

      const data = await response.json();
      if (data.success) {
        setSubForms(subForms.filter((f) => f.id !== id));
      } else {
        throw new Error(data.error || "Failed to delete form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete form");
      console.error("Delete error:", err);
    }
  };

  const handleRemoveFromModule = async (id: number) => {
    if (formData?.isPublic) {
      showAlert("Unpublish the modular form before removing forms");
      return;
    }

    const confirmed = await showConfirm(
      "Remove this form from the modular form? It will become a standalone form.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ moduleId: null }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to remove form from module");
      }

      await Promise.all([fetchForms(), fetchAvailableForms()]);
      setOpenMenuId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove form from module",
      );
    }
  };

  const handleToggleVisibility = async (form) => {
    try {
      const id = form.id;
      const isPublic = form.isPublic;
      const response = await fetch(`/api/forms/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      const data = await response.json();
      if (data.success) {
        setSubForms((prev) =>
          prev.map((f) => (f.id === id ? { ...f, isPublic: !isPublic } : f)),
        );
      } else {
        throw new Error(data.error || "Failed to update visibility");
      }
    } catch (err) {
      console.error("Visibility toggle error:", err);
      setError("Failed to update form visibility");
    }
  };

  const handleSaveProfileCondition = async () => {
    try {
      if (formData?.isPublic) {
        showAlert("Unpublish the form before modifying profile conditions");
        return;
      }

      const normalizedValues = selectedProfileValues
        .map((value) => value.trim())
        .filter(Boolean);

      if (normalizedValues.length === 0) {
        showAlert("Select at least one allowed value");
        return;
      }

      setSavingProfileCondition(true);
      const response = await fetch(
        `/api/mod-forms/${moduleId}/profile-conditions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileField,
            expectedValue: normalizedValues.join(", "),
          }),
        },
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save profile condition");
      }

      const updated = result.data as FormProfileCondition;
      setProfileConditions((prev) => {
        const idx = prev.findIndex(
          (p) => p.profileField === updated.profileField,
        );
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      setSelectedProfileValues(
        parseProfileConditionValues(updated.expectedValue),
      );
      setIsProfileValueDropdownOpen(false);
    } catch (err: any) {
      showAlert(err?.message || "Failed to save profile condition");
    } finally {
      setSavingProfileCondition(false);
    }
  };

  const handleDeleteProfileCondition = async (conditionId: number) => {
    const confirmed = await showConfirm(
      "Are you sure you want to delete this profile condition?",
    );
    if (!confirmed) return;

    try {
      if (formData?.isPublic) {
        showAlert("Unpublish the form before modifying profile conditions");
        return;
      }

      const response = await fetch(
        `/api/mod-forms/${moduleId}/profile-conditions/${conditionId}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete profile condition");
      }

      setProfileConditions((prev) => prev.filter((p) => p.id !== conditionId));
      const deletedCondition = profileConditions.find(
        (p) => p.id === conditionId,
      );
      if (deletedCondition?.profileField === profileField) {
        setSelectedProfileValues([]);
      }
    } catch (err: any) {
      showAlert(err?.message || "Failed to delete profile condition");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-900">Error: {error}</div>
      </div>
    );
  }
  if (!currentUser) {
    return null;
  }
  return (
    <AdminLayout user={currentUser} title="Form Builder">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToForms}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Forms
        </button>

        <div className="border-2 border-gray-300 rounded-lg bg-white divide-y divide-gray-200">
          <div className="px-8 py-6">
            {isEditingMeta ? (
              <div className="max-w-2xl space-y-3">
                <input
                  type="text"
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  placeholder="Form title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-2xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Form description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
                  >
                    {savingMeta ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setMetaName(formData?.name || "");
                      setMetaDescription(formData?.description || "");
                      setIsEditingMeta(false);
                    }}
                    disabled={savingMeta}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight truncate">
                      {formData?.name || "Untitled Form"}
                    </h1>
                    <button
                      onClick={() => setIsEditingMeta(true)}
                      title="Edit title and description"
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"
                        />
                      </svg>
                    </button>
                  </div>
                  {formData?.description && (
                    <p className="mt-1 text-gray-500 text-base">
                      {formData.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusPill status={status} />
                  <button
                    onClick={() => handleTogglePublic(!formData?.isPublic)}
                    disabled={savingVisibility}
                    className={`px-4 py-2 text-sm font-semibold rounded-md border-2 disabled:opacity-50 transition-colors ${
                      formData?.isPublic
                        ? "bg-white text-amber-800 border-amber-400 hover:bg-amber-50"
                        : "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    {savingVisibility
                      ? "Saving…"
                      : formData?.isPublic
                        ? "Unpublish"
                        : "Publish"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SETTINGS*/}
          <div className="px-8 py-5 bg-gray-50">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Settings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unlock Date  */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    Unlock Date
                  </span>
                  {formData?.unlockAt ? (
                    <StatusPill
                      status={
                        new Date(formData.unlockAt).getTime() > Date.now()
                          ? "Scheduled"
                          : "Unlocked"
                      }
                    />
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border bg-gray-50 text-gray-500 border-gray-200">
                      None
                    </span>
                  )}
                </div>

                {!isEditingUnlock ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {formData?.unlockAt
                        ? new Date(formData.unlockAt).toLocaleString()
                        : "No unlock date set"}
                    </p>
                    {!formData?.isPublic ? (
                      <button
                        onClick={() => {
                          setUnlockDraft(unlockLocal);
                          setIsEditingUnlock(true);
                        }}
                        className="px-2 py-1 text-xs font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Configure
                      </button>
                    ) : (
                      <span className="ml-3 text-xs text-gray-400 italic">
                        Unpublish to edit
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <input
                      ref={unlockInputRef}
                      type="datetime-local"
                      min={getNowLocalDateTimeValue()}
                      value={unlockDraft}
                      onChange={(e) => setUnlockDraft(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const ok = await handleSaveUnlockAt(unlockDraft);
                          if (ok) setIsEditingUnlock(false);
                        }}
                        disabled={savingUnlock}
                        className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
                      >
                        {savingUnlock ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setUnlockDraft(unlockLocal);
                          setIsEditingUnlock(false);
                        }}
                        disabled={savingUnlock}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      {formData?.unlockAt && (
                        <button
                          onClick={async () => {
                            const ok = await handleSaveUnlockAt("");
                            if (ok) {
                              setUnlockDraft("");
                              setUnlockLocal("");
                              setIsEditingUnlock(false);
                            }
                          }}
                          disabled={savingUnlock}
                          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Access card */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800">
                    Profile Access
                  </span>
                  {profileConditions.length > 0 ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      {profileConditions.length} rule
                      {profileConditions.length !== 1 && "s"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border bg-gray-50 text-gray-500 border-gray-200">
                      Open
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {profileConditions.length === 0
                      ? "All users can access this form"
                      : profileConditions
                          .map(
                            (c) =>
                              `${PROFILE_FIELD_LABELS[c.profileField]}: ${c.expectedValue}`,
                          )
                          .join(" · ")}
                  </p>
                  <button
                    onClick={openProfileAccessModal}
                    className="px-2 py-1 text-xs font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileConditions.length > 0 ? "Edit" : "Configure"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* FORMS SECTION */}
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Forms</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {subForms.length === 0
                    ? "No forms yet"
                    : `${subForms.length} form${subForms.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <button
                onClick={openAddFormModal}
                disabled={formData?.isPublic}
                className="px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Form
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">Loading forms…</p>
              </div>
            ) : subForms.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-400 text-sm">
                  No forms added yet. Click "+ Add Form" to get started.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {subForms.map((form) => (
                  <div
                    key={form.id}
                    onClick={() =>
                      navigate({
                        to: "/form-builder/$formId",
                        params: { formId: form.id.toString() },
                      })
                    }
                    className="group p-5 bg-white rounded-xl border border-gray-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between">
                        <h3 className="text-base font-semibold text-gray-800 group-hover:text-amber-700 leading-snug">
                          {form.name}
                        </h3>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 ml-2 flex-shrink-0"
                        >
                          <button
                            onClick={() => handleToggleVisibility(form)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isPublic ? "bg-amber-500" : "bg-gray-300"}`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${form.isPublic ? "translate-x-5" : "translate-x-1"}`}
                            />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-sm text-gray-500 flex-1 line-clamp-2">
                        {form.description || "No description"}
                      </p>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </p>
                        <div
                          className="relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === form.id ? null : form.id,
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-gray-100 transition"
                          >
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6h.01M12 12h.01M12 18h.01"
                              />
                            </svg>
                          </button>
                          {openMenuId === form.id && (
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                              <button
                                onClick={() =>
                                  navigate({
                                    to: "/form-builder/$formId",
                                    params: { formId: form.id.toString() },
                                  })
                                }
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  navigate({
                                    to: "/form-builder/modular-forms/$mId/conditions/$formId",
                                    params: {
                                      mId: moduleId,
                                      formId: form.id.toString(),
                                    },
                                  })
                                }
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              >
                                Conditions
                              </button>
                              <button
                                onClick={() => handleRemoveFromModule(form.id)}
                                className="w-full text-left px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                              >
                                Remove from Module
                              </button>
                              <button
                                onClick={() => handleDeleteForm(form.id)}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isProfileAccessModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Profile Access Conditions
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Allow access only to users whose profile matches the selected
                values. If no rules are set, everyone can access the form.
              </p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-[200px,1fr] md:items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Profile Field
                  </label>
                  <select
                    value={profileField}
                    onChange={(e) => {
                      const nextField = e.target.value as
                        | "faculty"
                        | "program"
                        | "isMcmasterStudent";
                      setProfileField(nextField);
                      setIsProfileValueDropdownOpen(false);
                      loadProfileConditionDraft(nextField);
                    }}
                    disabled={formData?.isPublic || savingProfileCondition}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="faculty">Faculty</option>
                    <option value="program">Program</option>
                    <option value="isMcmasterStudent">McMaster Student</option>
                  </select>
                </div>
                <div ref={profileValueDropdownRef}>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Allowed Values
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setIsProfileValueDropdownOpen((prev) => !prev)
                    }
                    disabled={formData?.isPublic || savingProfileCondition}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-left flex items-center justify-between disabled:opacity-50"
                  >
                    <span className="truncate pr-4 text-gray-700">
                      {selectedProfileValues.length > 0
                        ? selectedProfileValues.join(", ")
                        : "Select one or more values"}
                    </span>
                    <span className="text-gray-400">▾</span>
                  </button>
                  {isProfileValueDropdownOpen && (
                    <div className="mt-2 rounded-md border border-gray-200 bg-white shadow-lg">
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                        {PROFILE_VALUE_OPTIONS[profileField].map(
                          (valueOption) => (
                            <label
                              key={valueOption}
                              className="flex items-start gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedProfileValues.includes(
                                  valueOption,
                                )}
                                onChange={() => toggleProfileValue(valueOption)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span>{valueOption}</span>
                            </label>
                          ),
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedProfileValues([])}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsProfileValueDropdownOpen(false)}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-900"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-500">
                  Select multiple values to grant access to more than one
                  profile group.
                </p>
                <button
                  onClick={handleSaveProfileCondition}
                  disabled={formData?.isPublic || savingProfileCondition}
                  className="px-4 py-2 text-sm font-semibold rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {savingProfileCondition ? "Saving…" : "Save Condition"}
                </button>
              </div>
              {formData?.isPublic && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Unpublish the form before modifying profile access rules.
                </p>
              )}
              <div className="space-y-2">
                {profileConditions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No profile conditions set.
                  </p>
                ) : (
                  profileConditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                    >
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">
                          {PROFILE_FIELD_LABELS[condition.profileField] ??
                            condition.profileField}
                        </span>{" "}
                        must be one of: {condition.expectedValue}
                      </p>
                      <button
                        onClick={() =>
                          handleDeleteProfileCondition(condition.id)
                        }
                        disabled={formData?.isPublic}
                        className="px-2.5 py-1.5 text-xs font-semibold text-red-700 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={closeProfileAccessModal}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 border-2 border-amber-400">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Add Form To Module
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Create New Form
                  </h4>
                  <p className="text-sm text-gray-500">
                    Create a fresh sub-form inside this modular form.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Form Name
                  </label>
                  <input
                    type="text"
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    placeholder="Enter form name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newFormDescription}
                    onChange={(e) => setNewFormDescription(e.target.value)}
                    placeholder="Enter form description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleAddForm}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Create Form"}
                </button>
              </div>

              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Attach Existing Form
                  </h4>
                  <p className="text-sm text-gray-500">
                    Link an existing standalone form into this modular form.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Available Forms
                  </label>
                  <select
                    value={selectedExistingFormId}
                    onChange={(e) => setSelectedExistingFormId(e.target.value)}
                    disabled={loadingAvailableForms || attachingExisting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingAvailableForms
                        ? "Loading forms..."
                        : "Select a form"}
                    </option>
                    {availableForms.map((formOption) => (
                      <option key={formOption.id} value={formOption.id}>
                        {formOption.name}
                      </option>
                    ))}
                  </select>
                  {!loadingAvailableForms && availableForms.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      No standalone forms are available to attach.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAttachExistingForm}
                  disabled={
                    attachingExisting ||
                    loadingAvailableForms ||
                    availableForms.length === 0
                  }
                  className="w-full px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors font-semibold disabled:opacity-50"
                >
                  {attachingExisting ? "Attaching…" : "Attach Existing Form"}
                </button>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewFormName("");
                  setNewFormDescription("");
                  setSelectedExistingFormId("");
                }}
                disabled={submitting || attachingExisting}
                className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-semibold disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
