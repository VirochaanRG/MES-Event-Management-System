// src/components/DropdownAnswerQuestion.tsx
import { FormQuestion } from "@/interfaces/interfaces";
import { useState, useRef, useEffect } from "react";

export default function DropdownAnswerQuestion({
  question,
  answer,
  onChange,
}: {
  question: FormQuestion;
  answer?: string | string[];
  onChange: (value: string) => void;
}) {
  const { questionTitle, optionsCategory, required } = question;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  let choices: string[] = [];
  if (optionsCategory) {
    const parsed = JSON.parse(optionsCategory);
    if (Array.isArray(parsed.choices)) {
      choices = parsed.choices;
    }
  }

  const selectedValue = typeof answer === "string" ? answer : "";
  const selectedLabel = selectedValue ? selectedValue : "Select an option";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSelect = (choice: string) => {
    onChange(choice);
    setIsOpen(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border-2 border-red-900 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="text-lg text-gray-900 font-medium">
            {questionTitle || "Untitled Question"}
          </div>
        </div>
        {required && (
          <div className="text-sm text-red-900 font-medium">* Required</div>
        )}
      </div>

      <div className="relative" ref={dropdownRef}>
        {/* Custom Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-red-900 text-white border border-red-900 rounded-lg font-medium flex items-center justify-between hover:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-300"
        >
          <span>{selectedLabel}</span>
          <svg
            className={`w-5 h-5 transition-transform ${
              isOpen ? "transform rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Custom Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-red-900 rounded-lg shadow-lg z-50">
            {choices.length > 0 ? (
              choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(choice)}
                  className={`w-full px-4 py-3 text-left font-medium transition-colors ${
                    selectedValue === choice
                      ? "bg-yellow-300 text-red-900"
                      : "bg-white text-gray-900 hover:bg-yellow-300"
                  } ${index !== choices.length - 1 ? "border-b border-gray-200" : ""}`}
                >
                  {choice}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500">
                No options available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
