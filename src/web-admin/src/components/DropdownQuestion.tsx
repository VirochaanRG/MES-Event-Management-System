// src/components/DropdownQuestion.tsx
import { FormQuestion } from "@/interfaces/interfaces";

export default function DropdownQuestion({
  question,
  questionsList,
}: {
  question: FormQuestion;
  questionsList: FormQuestion[];
}) {
  const parentQuestion =
    question.parentQuestionId && question
      ? questionsList.find((q) => q.id === question.parentQuestionId)
      : null;

  const parentOptions = parentQuestion?.optionsCategory
    ? JSON.parse(parentQuestion.optionsCategory).choices
    : [];

  const options = question.optionsCategory
    ? JSON.parse(question.optionsCategory).choices
    : [];

  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-purple-600 font-medium mb-2">
            DROPDOWN
          </div>
          {parentQuestion && (
            <div className="text-sm text-gray-400">
              Follow up to "{parentQuestion?.questionTitle}" when answering{" "}
              {question?.enablingAnswers
                .map((i) => '"' + parentOptions[i] + '"')
                .join(", ")}
            </div>
          )}
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>
        </div>
        {question.required && (
          <div className="text-sm text-red-600 font-small mb-2">* Required</div>
        )}
      </div>
      <div className="mt-4">
        <div className="relative">
          <select
            disabled
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 appearance-none cursor-not-allowed"
          >
            <option value="">Select an option</option>
            {options.map((choice: string, index: number) => (
              <option key={index} value={index}>
                {choice}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
