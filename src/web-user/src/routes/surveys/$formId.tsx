import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Form } from "@/interfaces/interfaces";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCustomConfirm } from "@/components/CustomAlert";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/surveys/$formId")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showConfirm = useCustomConfirm();
  const { user } = useAuth();
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
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/forms/${formId}?uid=${encodeURIComponent(userId)}`,
        );
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

  useEffect(() => {
    const loadProfileStatus = async () => {
      if (!user?.id && !user?.email) {
        setHasProfile(false);
        return;
      }

      try {
        const endpoint = user.id
          ? `/api/profiles/${user.id}`
          : `/api/profiles?email=${encodeURIComponent(user.email)}`;

        const res = await fetch(endpoint, {
          credentials: "include",
        });
        const json = await res.json();

        setHasProfile(Boolean(json?.success && json?.data));
      } catch {
        setHasProfile(false);
      }
    };

    loadProfileStatus();
  }, [user?.id, user?.email]);

  const handleBack = () => {
    if (form?.moduleId) {
      navigate({ to: `/surveys/modular-form/${form.moduleId}` });
    } else {
      navigate({
        to: "/",
        search: {
          tab: "surveys",
          surveysSubTab:
            surveyProgress === "completed" ? "completed" : "available",
        },
      });
    }
  };

  const handleFillSurvey = () => {
    if (hasProfile === false) {
      toast.error("Complete your profile before answering surveys");
      navigate({ to: "/profile" });
      return;
    }

    navigate({ to: `/surveys/response/${formId}` });
  };

  const handleDeleteSubmission = async () => {
    const confirmation = await showConfirm(
      "Are you sure you want to delete your submission?",
    );
    if (!confirmation) return;

    const deleteResponse = await fetch(
      `/api/forms/${formId}/delete/${userId}`,
      {
        method: "DELETE",
      },
    );
    const deleteResult = await deleteResponse.json();
    if (!deleteResult.success) {
      toast.error("Unable to delete submission");
      return;
    }

    toast.success("Submission deleted");
    queryClient.invalidateQueries({ queryKey: ["availableSurveys"] });
    queryClient.invalidateQueries({ queryKey: ["completedSurveys"] });
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
            {form?.moduleId ? "Back to modules" : "Back to Surveys"}
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
          {hasProfile === false && (
            <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
              Complete your profile before answering surveys.
            </div>
          )}
          <div className="flex gap-4">
            <button
              className="flex-1 px-6 py-3 bg-red-900 text-white font-semibold rounded-lg hover:bg-red-800 transition-colors"
              onClick={handleFillSurvey}
              disabled={hasProfile === false}
            >
              {hasProfile === false
                ? "Complete Profile to Answer"
                : surveyProgress === "unfilled"
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
      </div>
    </div>
  );
}
