export function TextAnswerQuestion({ question, answer, rows = 1, onChange }) {
  return (
    <div className="p-6 border-2 border-red-900 rounded-lg shadow-sm transition-colors bg-white mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>
        </div>
        {question.required && (
          <div className="text-sm text-red-900 font-medium mb-2">
            * Required
          </div>
        )}
      </div>
      <div className="mt-4">
        <textarea
          className="w-full px-4 py-3 border border-red-900 rounded-lg bg-white text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-red-900"
          value={answer}
          rows={rows}
          onChange={(content) => onChange(content.target.value)}
        />
      </div>
    </div>
  );
}
