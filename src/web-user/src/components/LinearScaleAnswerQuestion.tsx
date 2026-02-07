export default function LinearScaleAnswerQuestion({
  question,
  answer,
  onChange,
}) {
  const { questionTitle, optionsCategory, required } = question;

  const config = optionsCategory
    ? JSON.parse(optionsCategory)
    : { min: 1, max: 5, minLabel: "", maxLabel: "" };

  const scaleValues = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => config.min + i
  );

  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>
        </div>
        {question.required && <div className="text-sm text-red-600 font-small mb-2">* Required</div>}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          {config.minLabel && (
            <span className="text-sm text-gray-600">{config.minLabel}</span>
          )}
          <span className="flex-1"></span>
          {config.maxLabel && (
            <span className="text-sm text-gray-600">{config.maxLabel}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          {scaleValues.map((value) => {
            const isSelected =
              answer !== undefined &&
              answer !== null &&
              answer.toString() === value.toString();
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange(value.toString())}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-400 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-sm font-medium">{value}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
