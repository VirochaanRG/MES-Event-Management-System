import { Form } from "@/interfaces/interfaces";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

interface FormWithStatus extends Form {
  status: "completed" | "available" | "locked";
}

export const Route = createFileRoute("/surveys/modular-form/$moduleId")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const userId = JSON.parse(
    sessionStorage.getItem("teamd-auth-user") ?? '{"email" : ""}',
  ).email;
  const { moduleId } = Route.useParams();
  const [module, setModule] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allForms, setAllForms] = useState<FormWithStatus[]>([]);

  const handleBack = () => {
    navigate({
      to: "/",
      search: { tab: "surveys", surveysSubTab: "available" },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleClickForm = (form: FormWithStatus) => {
    if (form.status !== "locked") {
      navigate({ to: `/surveys/${form.id}` });
    }
  };

  useEffect(() => {
    const fetchModuleAndSubforms = async () => {
      try {
        setLoading(true);
        const moduleResponse = await fetch(`/api/mod-forms/${moduleId}`);
        const moduleResult = await moduleResponse.json();

        if (!moduleResult.success) {
          throw new Error(moduleResult.error || "Failed to fetch module");
        }
        setModule(moduleResult.data);
        console.log(moduleResult.data);

        const formsResponse = await fetch(
          `/api/mod-forms/${moduleId}/all/${userId}`,
        );
        const formsResult = await formsResponse.json();
        if (!formsResult.success) {
          throw new Error(formsResult.error || "Failed to fetch forms");
        }
        setAllForms(formsResult.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleAndSubforms();
  }, [moduleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading form...</div>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">
            {error || "Survey not found"}
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to surveys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Surveys
        </button>

        {/* Survey Header */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {module.name}
              </h1>
            </div>
          </div>

          {module.description && (
            <p className="text-gray-700 text-lg leading-relaxed">
              {module.description}
            </p>
          )}
        </div>

        {/* All Forms Sections */}
        {allForms.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-red-900">
            <h2 className="text-2xl font-bold text-red-900 mb-6">Sections</h2>

            {/* Available/Incomplete Sections */}
            {allForms.filter((f) => f.status === "available").length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-300 rounded-full"></span>
                  Incomplete Sections
                </h3>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {allForms
                    .filter((f) => f.status === "available")
                    .map((form) => (
                      <div
                        key={`available-${form.id}`}
                        onClick={() => handleClickForm(form)}
                        className="group p-6 bg-white rounded-xl border-2 border-yellow-300 
                                  hover:border-yellow-400 hover:shadow-lg 
                                  transition-all cursor-pointer hover:bg-yellow-50"
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-red-900 mb-1 group-hover:text-red-700">
                              {form.name}
                            </h4>
                            <p className="text-gray-600 mb-4 line-clamp-3">
                              {form.description || "No description"}
                            </p>
                          </div>
                          <div className="pt-4 border-t border-yellow-200">
                            <span className="inline-block px-3 py-1 bg-yellow-300 text-red-900 text-xs font-semibold rounded-full">
                              Ready to Complete
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Completed Sections */}
            {allForms.filter((f) => f.status === "completed").length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Completed Sections
                </h3>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {allForms
                    .filter((f) => f.status === "completed")
                    .map((form) => (
                      <div
                        key={`completed-${form.id}`}
                        onClick={() => handleClickForm(form)}
                        className="group p-6 bg-green-50 rounded-xl border-2 border-green-300 
                                  hover:border-green-400 hover:shadow-lg 
                                  transition-all cursor-pointer"
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-green-800 mb-1 group-hover:text-green-700">
                              {form.name}
                            </h4>
                            <p className="text-gray-600 mb-4 line-clamp-3">
                              {form.description || "No description"}
                            </p>
                          </div>
                          <div className="pt-4 border-t border-green-200">
                            <span className="inline-block px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                              ✓ Completed
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Locked/Unavailable Sections */}
            {allForms.filter((f) => f.status === "locked").length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                  Locked Sections
                </h3>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {allForms
                    .filter((f) => f.status === "locked")
                    .map((form) => (
                      <div
                        key={`locked-${form.id}`}
                        className="group p-6 bg-gray-100 rounded-xl border-2 border-gray-300 
                                  opacity-60 transition-all cursor-not-allowed"
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-gray-500 mb-1">
                              {form.name}
                            </h4>
                            <p className="text-gray-500 mb-4 line-clamp-3">
                              {form.description || "No description"}
                            </p>
                          </div>
                          <div className="pt-4 border-t border-gray-200">
                            <span className="inline-block px-3 py-1 bg-gray-300 text-gray-600 text-xs font-semibold rounded-full">
                              🔒 Locked
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {allForms.length === 0 && (
              <p className="text-center text-gray-500">No sections available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
