import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FormQuestion } from "@/interfaces/interfaces";

export default function MultiSelectQuestion({
  question, questionsList
}: {
  question: FormQuestion;
  questionsList: FormQuestion[]
}) {
  const parentQuestion = question.parentQuestionId && question
    ? questionsList.find((q) => q.id === question.parentQuestionId)
    : null;

  const parentOptions = parentQuestion?.optionsCategory
    ? JSON.parse(parentQuestion.optionsCategory).choices
    : [];

  const options = question.optionsCategory
    ? JSON.parse(question.optionsCategory).choices
    : [];

  const minSelect = question.optionsCategory 
    ? JSON.parse(question.optionsCategory).min : 0;

  const maxSelect = question.optionsCategory 
    ? JSON.parse(question.optionsCategory).max : null;

  console.log(question + " " + minSelect + " " + maxSelect);

  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-orange-600 font-medium mb-2">
            MULTIPLE SELECTION
          </div>
           {parentQuestion && (<div className="text-sm text-gray-400">Follow up to "{parentQuestion?.questionTitle}" when answering {question?.enablingAnswers.map((i) => '"' + parentOptions[i] + '"').join(",")}</div>)}
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>          
          <div className="text-sm text-gray-400">
            { minSelect == maxSelect ? "Select exactly " + minSelect :
              minSelect !== 0 && maxSelect === null ? "Select at least " + minSelect :
              maxSelect !== null && minSelect === 0 ? "Select up to " + maxSelect :
              minSelect > 0 && maxSelect !== null ? "Select between "  + minSelect + " and " + maxSelect : ""}
          </div>
        </div>
        {question.required && <div className="text-sm text-red-600 font-small mb-2">* Required</div>}
      </div>
      <div className="space-y-2 mt-4">
        {options.map((choice: string, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className="w-4 h-4 border-2 border-gray-400"></div>
            <span className="text-gray-700">{choice}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
