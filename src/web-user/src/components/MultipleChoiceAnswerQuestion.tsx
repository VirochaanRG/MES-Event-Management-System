export default function MultipleChoiceAnswerQuestion({
  question,
  answer,
  onChange,
}) {
  const { questionTitle, optionsCategory, required } = question;

  let choices: string[] = [];
  if (optionsCategory) {
    const parsed = JSON.parse(optionsCategory);
    if (Array.isArray(parsed.choices)) {
      choices = parsed.choices;
    }
  }

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
      <div className="space-y-2 mt-4">
        {choices.map((choice, index) => {
          const id = `question-${question.id}-choice-${index}`;
          return (
            <label
              key={id}
              htmlFor={id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
            >
              <input
                type="radio"
                id={id}
                name={`question-${question.id}`}
                value={choice}
                checked={answer === choice}
                onChange={() => onChange(choice)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700">{choice}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
