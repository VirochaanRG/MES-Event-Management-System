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
    (_, i) => config.min + i,
  );

  return (
    <div className="p-6 border-2 border-red-900 rounded-lg shadow-sm bg-white mb-6">
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
        <div className="flex items-center justify-between mb-2">
          {config.minLabel && (
            <span className="text-sm text-red-900/80">{config.minLabel}</span>
          )}
          <span className="flex-1"></span>
          {config.maxLabel && (
            <span className="text-sm text-red-900/80">{config.maxLabel}</span>
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
                    ? "border-red-900 bg-red-900 text-yellow-300"
                    : "border-red-900 bg-white text-red-900 hover:bg-yellow-300"
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
