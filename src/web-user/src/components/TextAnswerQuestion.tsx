export function TextAnswerQuestion({ question, answer, rows = 1, onChange }) {
  return (
    <div className="p-6 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>
        </div>
        {question.required && (
          <div className="text-sm text-red-600 font-small mb-2">* Required</div>
        )}
      </div>
      <div className="mt-4">
        <textarea
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={answer}
          rows={rows}
          onChange={(content) => onChange(content.target.value)}
          placeholder="Your answer..."
        />
      </div>
    </div>
  );
}
