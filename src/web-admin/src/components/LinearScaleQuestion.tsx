import { FormQuestion } from "@/interfaces/interfaces";

export function LinearScaleQuestion({ question }: { question: FormQuestion }) {
  const config = question.optionsCategory
    ? JSON.parse(question.optionsCategory)
    : { min: 1, max: 5, minLabel: "", maxLabel: "" };

  const scaleValues = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => config.min + i
  );

  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-green-600 font-medium mb-2">
            LINEAR SCALE
          </div>
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>
        </div>
        <div className="text-sm text-gray-400">#{question.qorder}</div>
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
          {scaleValues.map((value) => (
            <div key={value} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full border-2 border-gray-400 flex items-center justify-center hover:bg-gray-50 cursor-pointer">
                <span className="text-sm font-medium text-gray-700">
                  {value}
                </span>
              </div>
              <span className="text-xs text-gray-500">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
