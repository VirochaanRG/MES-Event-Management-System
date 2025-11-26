import { FormQuestion } from "@/interfaces/interfaces";

export function TextAnswerQuestion({questionTitle, answer, rows = 1, onChange}) {
  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-lg text-gray-900 font-medium">
            {questionTitle || "Untitled Question"}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <textarea
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 resize-none"
          value={answer}
          rows={rows}
          onChange={(content) => onChange(content.target.value)}
        />
      </div>
    </div>
  );
}
