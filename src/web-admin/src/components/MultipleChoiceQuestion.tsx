import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FormQuestion } from "@/interfaces/interfaces";

export default function MultipleChoiceQuestion({
  question,
}: {
  question: FormQuestion;
}) {
  const options = question.optionsCategory
    ? JSON.parse(question.optionsCategory).choices
    : [];

  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-sm text-blue-600 font-medium mb-2">
            MULTIPLE CHOICE
          </div>
          <div className="text-lg text-gray-900 font-medium">
            {question.questionTitle || "Untitled Question"}
          </div>
        </div>
        <div className="text-sm text-gray-400">#{question.qorder}</div>
      </div>
      <div className="space-y-2 mt-4">
        {options.map((choice: string, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className="w-4 h-4 rounded-full border-2 border-gray-400"></div>
            <span className="text-gray-700">{choice}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
