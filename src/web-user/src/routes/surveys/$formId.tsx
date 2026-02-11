import {
  createFileRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Form } from "@/interfaces/interfaces";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const Route = createFileRoute("/surveys/$formId")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formId } = Route.useParams();
  const userId = JSON.parse(
    sessionStorage.getItem("teamd-auth-user") ?? '{"email" : ""}',
  ).email;
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyProgress, setSurveyProgress] = useState<
    "unfilled" | "started" | "completed"
  >("unfilled");

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/forms/${formId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch form");
        }
        setForm(result.data);
        const statusResponse = await fetch(
          `/api/forms/${formId}/status/${userId}`,
        );
        const statusResult = await statusResponse.json();
        if (!statusResult.success) {
          throw new Error(result.error || "Failed to fetch form");
        }
        console.log(statusResult.data);
        setSurveyProgress(statusResult.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleBack = () => {
    if(form?.moduleId) {
      navigate({ to: `/surveys/modular-form/${form.moduleId}` });
    } else {
      navigate({ to: "/" });
    }
  };

  const handleFillSurvey = () => {
    navigate({ to: `/surveys/response/${formId}` });
  };

  const handleDeleteSubmission = () => {
    const deleteSubmission = async () => {
      const confirmation = confirm(
        "Are you sure you want to delete your submission?",
      );
      if (!confirmation) return;
      const deleteResponse = await fetch(
        `/api/forms/${formId}/delete/${userId}`,
        { method: "DELETE" },
      );
      const deleteResult = await deleteResponse.json();
      if (!deleteResult.success) {
        toast.error("Unable to delete submission");
      } else {
        toast.success("Submission deleted");
      }

      queryClient.invalidateQueries({ queryKey: ["availableSurveys"] });
      queryClient.invalidateQueries({ queryKey: ["completedSurveys"] });
    };
    deleteSubmission();
    setSurveyProgress("unfilled");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-red-900">Loading form...</div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-red-900 mb-4">
            {error || "Survey not found"}
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors"
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
          className="mb-6 flex items-center gap-2 text-red-900 hover:text-red-700 transition-colors"
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
          {form?.moduleId ? "Back to modules" : "Back to Surveys"}
        </button>

        {/* Survey Header */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-red-900 p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-red-900 mb-2">
                {form.name}
              </h1>
            </div>
          </div>

          {form.description && (
            <p className="text-gray-700 text-lg leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-yellow-300 p-6">
          <div className="flex gap-4">
            <button
              className="flex-1 px-6 py-3 bg-red-900 text-white font-semibold rounded-lg hover:bg-red-800 transition-colors"
              onClick={handleFillSurvey}
            >
              {surveyProgress === "unfilled"
                ? "Fill out Survey"
                : surveyProgress === "started"
                  ? "Continue Filling"
                  : "Edit Submission"}
            </button>
            {(surveyProgress === "started" ||
              surveyProgress == "completed") && (
              <button
                className="flex-1 px-6 py-3 bg-yellow-300 text-red-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                onClick={handleDeleteSubmission}
              >
                Delete Submission
              </button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Created {formatDate(form.createdAt)}
        </div>
      </div>
    </div>
  );
}
