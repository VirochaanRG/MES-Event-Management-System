import { Form } from '@/interfaces/interfaces';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/surveys/modular-form/$moduleId')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate();
  const userId = JSON.parse(
    sessionStorage.getItem("teamd-auth-user") ?? '{"email" : ""}',
  ).email;
  const { moduleId } = Route.useParams();
  const [module, setModule] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incompleteForms, setIncompleteForms] = useState<Form[]>([]);
  const [completeForms, setCompleteForms] = useState<Form[]>([]);

  const handleBack = () => {
    navigate({ to: "/" });
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

  const handleClickForm = (form) => {
    navigate({ to: `/surveys/${form.id}` });
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
          console.log(module);

          const formsResponse = await fetch(`/api/mod-forms/${moduleId}/available/${userId}`);
          const formsResult = await formsResponse.json();
          if (!formsResult.success) {
            throw new Error(formsResult.error || "Failed to fetch forms");
          }
          setIncompleteForms(formsResult.data);
          
          const completedFormsResponse = await fetch(`/api/mod-forms/${moduleId}/completed/${userId}`);
          const completedFormsResult = await completedFormsResponse.json();
          if (!completedFormsResult.success) {
            throw new Error(completedFormsResult.error || "Failed to fetch forms");
          }
          setCompleteForms(completedFormsResult.data);
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

          {/* Incomplete Forms */}
          {incompleteForms.length > 0 && (<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Incomplete Sections
              </h2>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {incompleteForms.map((form) => (
                <div
                  key={`incomplete-${form.id}`}
                  onClick={() => handleClickForm(form)}
                  className="group p-6 bg-white rounded-xl border border-gray-200 
                            hover:border-amber-400 hover:shadow-md 
                            transition-all cursor-pointer"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800 mb-1 group-hover:text-amber-700">
                        {form.name}
                      </h3>

                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {form.description || "No description"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Created {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>)}

          {/* Completed Forms */}
          {completeForms.length > 0 && 
          (<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Completed Sections
              </h2>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 opacity-90">
              {completeForms.map((form) => (
                <div
                  key={`completed-${form.id}`}
                  onClick={() => handleClickForm(form)}
                  className="group p-6 bg-gray-50 rounded-xl border border-gray-200 
                            hover:border-emerald-400 hover:shadow-md 
                            transition-all cursor-pointer"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800 mb-1 group-hover:text-emerald-700">
                        {form.name}
                      </h3>

                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {form.description || "No description"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Created {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>)}
          {/* Metadata */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Created {formatDate(module.createdAt)}
          </div>
        </div>
      </div>
    );
}
