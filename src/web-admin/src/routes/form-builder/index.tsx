import AdminLayout from "@/components/AdminLayout";
import RequireRole from "@/components/RequireRole";
import { Form } from "@/interfaces/interfaces";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/form-builder/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [isFormModular, setIsFormModular] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const initAuth = () => {
      const sessionUser = getCurrentUser("admin");
      if (sessionUser) {
        if (sessionUser.roles && sessionUser.roles.includes("admin")) {
          setUser(sessionUser);
        } else {
          console.error("User does not have admin role");
          logout("admin");
          navigate({ to: "/" });
        }
      } else {
        navigate({ to: "/" });
      }
    };

    initAuth();
  }, [navigate]);

  // Fetch forms on component mount
  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const formsResponse = await fetch(`/api/forms`);
      const modFormsResponse = await fetch(`/api/mod-forms`);

      if (!formsResponse.ok || !modFormsResponse.ok) {
        throw new Error("Failed to fetch forms");
      }

      let allForms = [];
      const data = await formsResponse.json();
      if (data.success) {
        allForms = allForms.concat(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch forms");
      }
      const modFormData = await modFormsResponse.json();
      if (modFormData.success) {
        allForms = allForms.concat(modFormData.data);
      } else {
        throw new Error(modFormData.error || "Failed to fetch forms");
      }
      setForms(allForms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch forms");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddForm = async () => {
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
          isModular: isFormModular,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create form");
      }

      const data = await response.json();
      if (data.success) {
        setForms([...forms, data.data]);
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

  const handleDeleteForm = async (form) => {
    if (!confirm("Are you sure you want to delete this form?")) {
      return;
    }

    try {
      setError(null);
      const response = checkFormIsModular(form)
        ? await fetch(`/api/mod-forms/${form.id}`, {
            method: "DELETE",
          })
        : await fetch(`/api/forms/${form.id}`, {
            method: "DELETE",
          });

      if (!response.ok) {
        throw new Error("Failed to delete form");
      }

      const data = await response.json();
      if (data.success) {
        setForms(forms.filter((f) => f.id !== form.id));
      } else {
        throw new Error(data.error || "Failed to delete form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete form");
      console.error("Delete error:", err);
    }
  };

  const checkFormIsModular = (form) => {
    return form.moduleId === undefined;
  };

  const handleClickForm = (form) => {
    if (checkFormIsModular(form)) {
      navigate({
        to: "/form-builder/modular-forms/$moduleId",
        params: { moduleId: form.id.toString() },
      });
    } else {
      navigate({
        to: "/form-builder/$formId",
        params: { formId: form.id.toString() },
      });
    }
  };

  const handleToggleVisibility = async (form) => {
    try {
      const id = form.id;
      const isPublic = form.isPublic;
      const response = checkFormIsModular(form)
        ? await fetch(`/api/mod-forms/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isPublic: !isPublic }),
          })
        : await fetch(`/api/forms/${id}`, {
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
        setForms((prev) =>
          prev.map((f) =>
            f.id === id && checkFormIsModular(f) === checkFormIsModular(form)
              ? { ...f, isPublic: !isPublic }
              : f,
          ),
        );
      } else {
        throw new Error(data.error || "Failed to update visibility");
      }
    } catch (err) {
      console.error("Visibility toggle error:", err);
      setError("Failed to update form visibility");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <RequireRole
      userRoles={user.roles}
      requiredRole="forms"
      redirectTo="/denied"
    >
      <AdminLayout
        user={user}
        title="Events Management"
        subtitle="Manage and organize all your events"
      >
        <main>
          <div className="px-5 py-10 bg-gray-50 rounded-lg mx-5 my-5">
            <button
              onClick={() => navigate({ to: "/" })}
              className="mb-6 px-4 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors font-semibold"
            >
              ← Back to Home
            </button>
            <h1 className="text-4xl text-gray-800 mb-2">Form Builder</h1>
            <p className="text-lg text-gray-600 mb-7">
              Create and manage your forms
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Current Forms
                </h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-2 font-semibold bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                >
                  + Add New Form
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Loading forms...</p>
                </div>
              ) : forms.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-4">No forms</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {forms.map((form) => (
                    <div
                      key={form.id}
                      onClick={() => handleClickForm(form)}
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 mb-1">
                            {form.name}
                          </h3>
                          <p className="text-gray-600 mb-2">
                            {form.description || "No description"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Created:{" "}
                            {new Date(form.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2"
                          >
                            <button
                              onClick={() => handleToggleVisibility(form)}
                              className={`
                                relative inline-flex h-6 w-11 items-center rounded-full
                                transition-colors
                                ${form.isPublic ? "bg-amber-500" : "bg-gray-300"}
                              `}
                            >
                              <span
                                className={`
                                  inline-block h-4 w-4 transform rounded-full bg-white
                                  transition-transform
                                  ${form.isPublic ? "translate-x-6" : "translate-x-1"}
                                `}
                              />
                            </button>

                            <span className="text-sm text-gray-700">
                              {form.isPublic ? "Public" : "Private"}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteForm(form);
                            }}
                            className="px-4 py-2 text-red-800 hover:bg-red-50 rounded transition-colors ml-2 font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Form Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 border-2 border-amber-500">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    Create New Form
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={newFormDescription}
                        onChange={(e) => setNewFormDescription(e.target.value)}
                        placeholder="Enter form description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="modular"
                        className="text-sm font-medium text-gray-900"
                      >
                        Make form modular
                      </label>
                      <input
                        type="checkbox"
                        id="modular"
                        checked={isFormModular}
                        onChange={(e) => setIsFormModular(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setNewFormName("");
                        setNewFormDescription("");
                      }}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddForm}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold disabled:opacity-50"
                    >
                      {submitting ? "Creating..." : "Create Form"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </AdminLayout>
    </RequireRole>
  );
}
