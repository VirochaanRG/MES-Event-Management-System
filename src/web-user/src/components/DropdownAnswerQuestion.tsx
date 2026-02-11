// src/components/DropdownAnswerQuestion.tsx
import { FormQuestion } from "@/interfaces/interfaces";

export default function DropdownAnswerQuestion({
  question,
  answer,
  onChange,
}: {
  question: FormQuestion;
  answer?: string | string[];
  onChange: (value: string) => void;
}) {
  const { questionTitle, optionsCategory, required } = question;

  let choices: string[] = [];
  if (optionsCategory) {
    const parsed = JSON.parse(optionsCategory);
    if (Array.isArray(parsed.choices)) {
      choices = parsed.choices;
    }
  }

  const selectedValue = typeof answer === "string" ? answer : "";

  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-lg text-gray-900 font-medium">
            {questionTitle || "Untitled Question"}
          </div>
        </div>
        {required && (
          <div className="text-sm text-red-600 font-medium">* Required</div>
        )}
      </div>

      <div className="relative">
        <select
          value={selectedValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <option value="">Select an option</option>
          {choices.map((choice, index) => (
            <option key={index} value={choice}>
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
  );
}
