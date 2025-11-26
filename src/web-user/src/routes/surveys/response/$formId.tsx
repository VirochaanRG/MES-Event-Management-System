import { TextAnswerQuestion } from "@/components/TextAnswerQuestion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { on } from "events";
import { StatSyncFn } from "fs";
import { useState, useEffect } from "react";
import MultipleChoiceAnswerQuestion from "@/components/MultipleChoiceAnswerQuestion";
import LinearScaleAnswerQuestion from "@/components/LinearScaleAnswerQuestion";
import { FormQuestion, FormAnswer, Form, FormResponse} from "@/interfaces/interfaces";

export const Route = createFileRoute("/surveys/response/$formId")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { formId } = Route.useParams();
  const userId = sessionStorage.getItem("teamd-auth-user");
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyProgress, setSurveyProgress] = useState<
    "unfilled" | "started" | "completed"
  >("unfilled");
  const [responses, setResponses] = useState<FormResponse[]>([]);

  useEffect(() => {
    const fetchFormAndQuestions = async () => {
      try {
        setLoading(true);
        const formResponse = await fetch(`/api/forms/${formId}`);
        const formResult = await formResponse.json();

        if (!formResult.success) {
          throw new Error(formResult.error || "Failed to fetch form");
        }
        setForm(formResult.data);

        const questionsResponse = await fetch(`/api/forms/questions/${formId}`);
        const questionsResult = await questionsResponse.json();

        if (!questionsResult.success) {
          throw new Error(questionsResult.error || "Failed to fetch form");
        }
        var questions: FormQuestion[] = questionsResult.data;

        const answersResponse = await fetch(
          `/api/forms/${formId}/answers/${userId}`
        );
        const answersResult = await answersResponse.json();
        var answers: FormAnswer[] = answersResult.success ? answersResult.data : [];
        setResponses(
          questions.map((q) => {
            var response: FormResponse = {
              question: q,
              answer: answers.find((a) => a.questionId == q.id),
            };

            return response;
          })
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFormAndQuestions();
  }, [formId]);

  const handleBack = () => {
    navigate({ to: "/" });
  };

  const handleResponseOnChange = (response: FormResponse, answer: string) => {
    setResponses((prev) =>
      prev.map((r) => {
        // if this is the response we want to update
        if (r.question.id === response.question.id) {
          // create a new Answer object
          const newAnswer: FormAnswer = {
            id: r.answer?.id ?? 0, // keep id or 0 if undefined
            userId: r.answer?.userId ?? 0,
            formId: r.question.formId,
            questionId: r.question.id,
            questionType: r.question.questionType,
            answer: answer,
            createdAt: r.answer?.createdAt ?? "",
          };
          return { ...r, answer: newAnswer };
        }
        return r;
      })
    );
  };

  const handleSubmit = () => {
    const submitForm = async () => {
      for (const response of responses) {
        const request = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qid: response.question.id,
            uid: userId ?? "",
            answer: response.answer?.answer,
            questionType: response.question.questionType,
          }),
        };
        const submitResponse = await fetch(
          `/api/forms/${formId}/answers/${userId}`,
          request
        );
        const submitResult = await submitResponse.json();
        if (!submitResult.success) {
          throw new Error(
            submitResult.error ||
              "Could not submit question with ID: " + response.question.id
          );
        }
      }
    };
    submitForm();
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading form...</div>
      </div>
    );
  }

  if (error || !form) {
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

        {/* Questions */}
        {responses
          .sort((r1, r2) => r1.question.qOrder - r2.question.qOrder)
          .map((response: FormResponse) =>
            response.question.questionType === "text_answer" ? (
              <TextAnswerQuestion
                key={response.question.id}
                questionTitle={response.question.questionTitle}
                answer={response.answer?.answer}
                onChange={(e) => handleResponseOnChange(response, e)}
              />
            ) : response.question.questionType === "multiple_choice" ? (
              <MultipleChoiceAnswerQuestion
                key={response.question.id}
                question={response.question}
                answer={response.answer?.answer}
                onChange={(e) => handleResponseOnChange(response, e)}
              />
            ) : response.question.questionType === "linear_scale" ? (
              <LinearScaleAnswerQuestion
                key={response.question.id}
                question={response.question}
                answer={response.answer?.answer}
                onChange={(e) => handleResponseOnChange(response, e)}
              />
            ) : (
              <div></div>
            )
          )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6">
          <div className="flex gap-4">
            <button className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Save
            </button>
            <button
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleSubmit}
            >
              Submit
            </button>
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
