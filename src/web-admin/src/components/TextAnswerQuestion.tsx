import { FormQuestion } from "@/interfaces/interfaces";

export function TextAnswerQuestion({ question }: { question: FormQuestion }) {
  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-purple-600 font-medium mb-2">
            TEXT ANSWER
          </div>
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>
        </div>
        <div className="text-sm text-gray-400">#{question.qorder}</div>
      </div>
      <div className="mt-4">
        <textarea
          disabled
          placeholder="User's answer will appear here..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 resize-none"
          rows={3}
        />
      </div>
    </div>
  );
}
