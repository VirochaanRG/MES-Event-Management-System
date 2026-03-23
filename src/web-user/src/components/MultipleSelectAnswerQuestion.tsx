import { FormQuestion } from "@/interfaces/interfaces";

export default function MultipleSelectAnswerQuestion({
  question,
  answer,
  onChange,
}) {
  const { questionTitle, optionsCategory, required } = question;

  let choices: string[] = [];
  let minSelect = 0;
  let maxSelect;
  if (optionsCategory) {
    const parsed = JSON.parse(optionsCategory);
    if (Array.isArray(parsed.choices)) {
      choices = parsed.choices;
    }
    minSelect = parsed.min;
    maxSelect = parsed.max;
  }

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
      <div className="text-sm text-red-900/80">
        {minSelect == maxSelect
          ? "Select exactly " + minSelect
          : minSelect !== 0 && maxSelect === null
            ? "Select at least " + minSelect
            : maxSelect !== null && minSelect === 0
              ? "Select up to " + maxSelect
              : minSelect > 0 && maxSelect !== null
                ? "Select between " + minSelect + " and " + maxSelect
                : ""}
      </div>
      <div className="space-y-2 mt-4">
        {choices.map((choice, index) => {
          const id = `question-${question.id}-choice-${index}`;
          const isSelected = Array.isArray(answer) && answer.includes(choice);
          return (
            <label
              key={id}
              htmlFor={id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                isSelected
                  ? "bg-yellow-300 border-red-900"
                  : "bg-white border-red-200 hover:bg-yellow-300"
              }`}
            >
              <input
                type="checkbox"
                id={id}
                name={`question-${question.id}`}
                checked={Array.isArray(answer) && answer.includes(choice)}
                onChange={() => onChange(choice)}
                className="h-4 w-4 accent-red-900 border-red-900 focus:ring-yellow-300"
              />
              <span className="text-gray-900">{choice}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
