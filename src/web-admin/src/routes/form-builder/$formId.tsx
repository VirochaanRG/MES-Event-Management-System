import { LinearScaleQuestion } from "@/components/LinearScaleQuestion";
import MultipleChoiceQuestion from "@/components/MultipleChoiceQuestion";
import { TextAnswerQuestion } from "@/components/TextAnswerQuestion";
import { Form, FormQuestion } from "@/interfaces/interfaces";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/form-builder/$formId")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { formId } = Route.useParams();
  const [formData, setFormData] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [mcChoices, setMcChoices] = useState<string[]>(["", ""]);
  const [scaleMin, setScaleMin] = useState("1");
  const [scaleMax, setScaleMax] = useState("5");
  const [scaleMinLabel, setScaleMinLabel] = useState("");
  const [scaleMaxLabel, setScaleMaxLabel] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/forms/${formId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch data");
        }

        setFormData(result.data);

        // Fetch questions
        const questionsResponse = await fetch(`/api/forms/${formId}/questions`);
        const questionsResult = await questionsResponse.json();

        if (questionsResult.success) {
          setQuestions(questionsResult.data || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [formId]);

  const handleAddComponent = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const openModal = (questionType: string) => {
    setSelectedQuestionType(questionType);
    setQuestionTitle("");
    setMcChoices(["", ""]);
    setScaleMin("1");
    setScaleMax("5");
    setScaleMinLabel("");
    setScaleMaxLabel("");
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedQuestionType("");
  };

  const addMcChoice = () => {
    setMcChoices([...mcChoices, ""]);
  };

  const removeMcChoice = (index: number) => {
    if (mcChoices.length > 2) {
      setMcChoices(mcChoices.filter((_, i) => i !== index));
    }
  };

  const updateMcChoice = (index: number, value: string) => {
    const updated = [...mcChoices];
    updated[index] = value;
    setMcChoices(updated);
  };

  const handleAddQuestion = async () => {
    try {
      if (!questionTitle.trim()) {
        alert("Please enter a question title");
        return;
      }

      let optionsCategory = "";

      if (selectedQuestionType === "multiple_choice") {
        const validChoices = mcChoices.filter((c) => c.trim() !== "");
        if (validChoices.length < 2) {
          alert("Please provide at least 2 choices");
          return;
        }
        optionsCategory = JSON.stringify({ choices: validChoices });
      } else if (selectedQuestionType === "linear_scale") {
        optionsCategory = JSON.stringify({
          min: parseInt(scaleMin),
          max: parseInt(scaleMax),
          minLabel: scaleMinLabel,
          maxLabel: scaleMaxLabel,
        });
      }

      const nextOrder =
        questions.length > 0
          ? Math.max(...questions.map((q) => q.qorder)) + 1
          : 1;

      const response = await fetch(`/api/forms/${formId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionType: selectedQuestionType,
          questionTitle: questionTitle.trim(),
          optionsCategory,
          qorder: nextOrder,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to add question");
      }

      setQuestions([...questions, result.data]);
      closeModal();
    } catch (err: any) {
      console.error("Failed to add question:", err.message);
      alert("Failed to add question: " + err.message);
    }
  };

  const handleBackToForms = () => {
    navigate({ to: "/form-builder" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBackToForms}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Forms
        </button>

        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {formData?.name || "Untitled"}
            </h1>
            <p className="text-gray-600">
              {formData?.description || "No description provided"}
            </p>
          </div>
          <div className="relative ml-4" ref={dropdownRef}>
            <button
              onClick={handleAddComponent}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add Component
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border-2 border-gray-300 py-1 z-10">
                <button
                  onClick={() => openModal("multiple_choice")}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                >
                  Multiple Choice
                </button>
                <button
                  onClick={() => openModal("text_answer")}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                >
                  Text Answer
                </button>
                <button
                  onClick={() => openModal("linear_scale")}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium"
                >
                  Linear Scale
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Components
          </h2>
          {questions.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No components added yet. Click "Add Component" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => {
                if (question.questionType === "multiple_choice") {
                  return (
                    <MultipleChoiceQuestion
                      key={question.id}
                      question={question}
                    />
                  );
                } else if (question.questionType === "linear_scale") {
                  return (
                    <LinearScaleQuestion
                      key={question.id}
                      question={question}
                    />
                  );
                } else if (question.questionType === "text_answer") {
                  return (
                    <TextAnswerQuestion key={question.id} question={question} />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-300">
            <div className="p-6 border-b-2 border-gray-300">
              <h3 className="text-xl font-semibold text-gray-900">
                Add {selectedQuestionType.replace("_", " ")} Question
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Question Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your question"
                />
              </div>

              {/* Multiple Choice Options */}
              {selectedQuestionType === "multiple_choice" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choices *
                  </label>
                  <div className="space-y-2">
                    {mcChoices.map((choice, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={choice}
                          onChange={(e) =>
                            updateMcChoice(index, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Choice ${index + 1}`}
                        />
                        {mcChoices.length > 2 && (
                          <button
                            onClick={() => removeMcChoice(index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addMcChoice}
                    className="mt-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    + Add Choice
                  </button>
                </div>
              )}

              {/* Linear Scale Options */}
              {selectedQuestionType === "linear_scale" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Value *
                      </label>
                      <input
                        type="number"
                        value={scaleMin}
                        onChange={(e) => setScaleMin(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Value *
                      </label>
                      <input
                        type="number"
                        value={scaleMax}
                        onChange={(e) => setScaleMax(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Label (optional)
                      </label>
                      <input
                        type="text"
                        value={scaleMinLabel}
                        onChange={(e) => setScaleMinLabel(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Not at all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Label (optional)
                      </label>
                      <input
                        type="text"
                        value={scaleMaxLabel}
                        onChange={(e) => setScaleMaxLabel(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Extremely"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t-2 border-gray-300 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium border-2 border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
