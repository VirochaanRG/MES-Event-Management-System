import { TextAnswerQuestion } from "@/components/TextAnswerQuestion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import MultipleChoiceAnswerQuestion from "@/components/MultipleChoiceAnswerQuestion";
import LinearScaleAnswerQuestion from "@/components/LinearScaleAnswerQuestion";
import {
  FormQuestion,
  FormAnswer,
  Form,
  FormResponse,
} from "@/interfaces/interfaces";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import MultipleSelectAnswerQuestion from "@/components/MultipleSelectAnswerQuestion";
import DropdownAnswerQuestion from "@/components/DropdownAnswerQuestion";

export const Route = createFileRoute("/surveys/response/$formId")({
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<FormResponse[]>([]);

  const visibleResponses = useMemo(() => {
    return [...responses]
      .sort((a, b) => (a.question.qorder ?? 0) - (b.question.qorder ?? 0))
      .filter((r) => {
        const parentId = r.question.parentQuestionId;
        if (!parentId) return true;

        const parentResponse = responses.find(
          (x) => x.question.id === parentId,
        );
        if (!parentResponse) return false;

        const parsedOptions = parentResponse.question.optionsCategory
          ? JSON.parse(parentResponse.question.optionsCategory)
          : null;

        const choices: string[] = parsedOptions?.choices ?? [];
        const enablingAnswers = r.question.enablingAnswers.map(
          (i) => choices[i] + "",
        );

        const parentAnswer = parentResponse.answer?.answer;

        if (Array.isArray(parentAnswer)) {
          return parentAnswer.some((a) => enablingAnswers.includes(a));
        }

        const visible = enablingAnswers.includes(parentAnswer ?? "");
        if (!visible && r.answer) r.answer.answer = "";
        return visible;
      });
  }, [responses]);

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
        console.log(form);

        const questionsResponse = await fetch(`/api/forms/questions/${formId}`);
        const questionsResult = await questionsResponse.json();

        if (!questionsResult.success) {
          throw new Error(questionsResult.error || "Failed to fetch form");
        }
        var questions: FormQuestion[] = questionsResult.data;

        const answersResponse = await fetch(
          `/api/forms/${formId}/answers/${userId}`,
        );
        const answersResult = await answersResponse.json();
        var answers: FormAnswer[] = answersResult.success
          ? answersResult.data
          : [];
        setResponses(
          questions.map((q) => {
            var response: FormResponse = {
              question: q,
              answer: answers.find((a) => a.questionId == q.id),
            };

            return response;
          }),
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
    if(form?.moduleId) {
      navigate({ to: `/surveys/modular-form/${form.moduleId}` });
    } else {
      navigate({ to: "/" });
    }
  };

  const handleResponseOnChange = (response: FormResponse, value: string) => {
    setResponses((prev) =>
      prev.map((r) => {
        if (r.question.id !== response.question.id) return r;

        let updatedAnswer: string | string[];

        if (r.question.questionType === "multi_select") {
          const prevAnswers = Array.isArray(r.answer?.answer)
            ? r.answer!.answer
            : [];

          updatedAnswer = prevAnswers.includes(value)
            ? prevAnswers.filter((v) => v !== value) // uncheck
            : [...prevAnswers, value]; // check
        } else {
          updatedAnswer = value;
        }

        const newAnswer: FormAnswer = {
          id: r.answer?.id ?? 0,
          userId: r.answer?.userId ?? 0,
          formId: r.question.formId,
          questionId: r.question.id,
          questionType: r.question.questionType,
          createdAt: r.answer?.createdAt ?? "",
          answer: updatedAnswer,
        };

        return { ...r, answer: newAnswer };
      }),
    );
  };

  const saveForm = async () => {
    for (const response of visibleResponses) {
      if (!response.answer || response.answer.answer.length == 0) continue;
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
        request,
      );
      const submitResult = await submitResponse.json();
      if (!submitResult.success) {
        toast.error("Unable to save reponse");
      }
    }
  };

  const handleSubmit = () => {
    const postSubmission = async () => {
      const submitReponse = await fetch(
        `/api/forms/${formId}/submit/${userId}`,
        {
          method: "PATCH",
        },
      );
      const submitResult = await submitReponse.json();
      if (!submitResult.success) {
        throw new Error(submitResult.error || "Unable to submit form");
      }
    };
    try {
      setSubmitting(true);
      if (
        visibleResponses
          .filter((r) => r.question.required)
          .some(
            (r) =>
              !r.answer ||
              !r.answer.answer ||
              (Array.isArray(r.answer.answer) && r.answer.answer.length === 0),
          )
      ) {
        toast.error("Please fill in all required fields");
      } else {
        const confirmation = confirm("Are you sure you want to submit?");
        if (!confirmation) return;
        saveForm();
        postSubmission();
        setSubmitted(true);
        queryClient.invalidateQueries({ queryKey: ["availableSurveys"] });
        queryClient.invalidateQueries({ queryKey: ["completedSurveys"] });
      }
    } catch (err: any) {
      toast.error("Unable to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = () => {
    try {
      saveForm();
      toast.success("Your response has been saved.");
    } catch (err: any) {
      setError(err.message);
    }
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
            {form?.moduleId ? "Back to modules" : "Back to surveys"}
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
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
            {form?.moduleId ? "Back to modules" : "Back to surveys"}
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
            <p className="text-gray-700 text-lg leading-relaxed">
              {form.description}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border-2 border-yellow-300 p-8 mb-6">
            <p className="text-gray-700 text-lg leading-relaxed py-5">
              Thank you for your submission. Your response has been recorded.
            </p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors"
            >
            {form?.moduleId ? "Back to modules" : "Back to surveys"}
            </button>
          </div>
          {/* Metadata */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Created {formatDate(form.createdAt)}
          </div>
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
            {form?.moduleId ? "Back to modules" : "Back to surveys"}
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

        {/* Questions */}
        {visibleResponses.map((response: FormResponse) =>
          response.question.questionType === "text_answer" ? (
            <TextAnswerQuestion
              key={response.question.id}
              question={response.question}
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
          ) : response.question.questionType === "dropdown" ? (
            <DropdownAnswerQuestion
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
          ) : response.question.questionType === "multi_select" ? (
            <MultipleSelectAnswerQuestion
              key={response.question.id}
              question={response.question}
              answer={response.answer?.answer}
              onChange={(e) => handleResponseOnChange(response, e)}
            />
          ) : (
            <div></div>
          ),
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-yellow-300 p-6">
          <div className="flex gap-4">
            <button
              className="flex-1 px-6 py-3 bg-yellow-300 text-red-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="flex-1 px-6 py-3 bg-red-900 text-white font-semibold rounded-lg hover:bg-red-800 transition-colors"
              onClick={handleSubmit}
              disabled={submitting}
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
