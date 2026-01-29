import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Form } from "@/interfaces/interfaces";

export default function ReportsTab() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3124/api/forms", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch forms");
      }

      const data = await response.json();
      if (data.success) {
        setForms(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch forms");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFormClick = (formId: number) => {
    navigate({
      to: "/analytics/$analyticsId",
      params: { analyticsId: formId.toString() },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading forms...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchForms}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No forms found</p>
        <p className="text-sm text-gray-500">
          Create a form using the Form Builder to see it here
        </p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-2xl font-bold text-stone-900 mb-3 border-b-2 border-red-900 pb-2 inline-block">
        Form Reports
      </h4>
      <p className="text-gray-600 mb-6">
        Select a form to view its submissions and analytics
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms.map((form) => (
          <div
            key={form.id}
            onClick={() => handleFormClick(form.id)}
            className="bg-white border border-gray-300 rounded-lg p-5 hover:shadow-lg hover:border-red-900 transition-all cursor-pointer"
          >
            <h5 className="text-lg font-semibold text-gray-800 mb-2">
              {form.name}
            </h5>
            {form.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {form.description}
              </p>
            )}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                Created: {new Date(form.createdAt).toLocaleDateString()}
              </span>
              <span className="text-sm text-red-900 font-medium">
                View Report →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
