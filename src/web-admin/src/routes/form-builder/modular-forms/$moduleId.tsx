import AdminLayout from "@/components/AdminLayout";
import { Form, SimpleForm, ModularForm } from "@/interfaces/interfaces";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/form-builder/modular-forms/$moduleId")({
  component: RouteComponent,
});

const API_URL = "http://localhost:3124";

function RouteComponent() {
  const navigate = useNavigate();
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

  useEffect(() => {
    console.log("subforms updated:", subForms);
  }, [subForms]);

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
  
    const fetchForms = async () => {
      try {
        setLoading(true);
        setError(null);
        const formsResponse = await fetch(`${API_URL}/api/mod-forms/sub-forms/${moduleId}`);
  
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
  
    const handleAddForm = async () => {
      if (!newFormName.trim()) {
        setError("Form name is required");
        return;
      }
  
      try {
        setSubmitting(true);
        setError(null);
  
        const response = await fetch(`${API_URL}/api/forms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newFormName.trim(),
            description: newFormDescription.trim() || null,
            moduleId: moduleId
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

  const handleBackToForms = () => {
    navigate({ to: "/form-builder" });
  };

  const handleDeleteForm = async (id: number) => {
    if (!confirm("Are you sure you want to delete this form?")) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/forms/${id}`, {
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
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }
  if (!currentUser) {
    return null;
  }
  return (
    <AdminLayout
      user={currentUser}
      title="Form Builder"
      subtitle="Create and edit forms"
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToForms}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
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

        {/* Outer Form Border */}
        <div className="border-2 border-gray-300 rounded-lg bg-white p-8">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                  {formData?.name || "Untitled Form"}
                </h1>
              </div>
              <div className="relative z-20">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-2 font-semibold bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                >
                  + Add New Form
                </button>
              </div>
            </div>
            {formData?.description && (
              <p className="text-gray-600 text-lg mt-2">
                {formData.description}
              </p>
            )}

            {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Loading forms...</p>
                </div>
              ) : subForms.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-4">No forms</p>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {subForms.map((form) => (
                    <div
                      key={form.id}
                      onClick={() =>
                        navigate({
                          to: "/form-builder/$formId",
                          params: { formId: form.id.toString() },
                        })
                      }
                      className="group p-6 bg-white rounded-xl border border-gray-200 
                                hover:border-amber-400 hover:shadow-md 
                                transition-all cursor-pointer"
                    >
                      <div className="flex flex-col h-full">
                        {/* Content */}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-800 mb-1 group-hover:text-amber-700">
                            {form.name}
                          </h3>

                          <p className="text-gray-600 mb-4 line-clamp-3">
                            {form.description || "No description"}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-500">
                            {new Date(form.createdAt).toLocaleDateString()}
                          </p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteForm(form.id);
                            }}
                            className="text-sm font-semibold text-red-700 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
        </div>
      </div>
    </AdminLayout>
  );
}
