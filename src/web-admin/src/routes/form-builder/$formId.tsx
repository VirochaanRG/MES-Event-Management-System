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
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(
    null
  );
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
    setEditingQuestion(null);
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

  const openEditModal = (question: FormQuestion) => {
    setEditingQuestion(question);
    setSelectedQuestionType(question.questionType);
    setQuestionTitle(question.questionTitle || "");

    // Parse options based on question type
    if (
      question.questionType === "multiple_choice" &&
      question.optionsCategory
    ) {
      const parsed = JSON.parse(question.optionsCategory);
      setMcChoices(parsed.choices || ["", ""]);
    } else if (
      question.questionType === "linear_scale" &&
      question.optionsCategory
    ) {
      const parsed = JSON.parse(question.optionsCategory);
      setScaleMin(String(parsed.min || 1));
      setScaleMax(String(parsed.max || 5));
      setScaleMinLabel(parsed.minLabel || "");
      setScaleMaxLabel(parsed.maxLabel || "");
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedQuestionType("");
    setEditingQuestion(null);
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

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/forms/${formId}/questions/${questionId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete question");
      }

      setQuestions(questions.filter((q) => q.id !== questionId));
    } catch (err: any) {
      console.error("Failed to delete question:", err.message);
      alert("Failed to delete question: " + err.message);
    }
  };

  const handleMoveUp = async (questionId: number) => {
    try {
      const response = await fetch(
        `/api/forms/${formId}/questions/${questionId}/move-up`,
        {
          method: "PATCH",
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to move question up");
      }

      // Refetch questions to get updated order
      const questionsResponse = await fetch(`/api/forms/${formId}/questions`);
      const questionsResult = await questionsResponse.json();

      if (questionsResult.success) {
        setQuestions(questionsResult.data || []);
      }
    } catch (err: any) {
      console.error("Failed to move question up:", err.message);
      alert("Failed to move question up: " + err.message);
    }
  };

  const handleMoveDown = async (questionId: number) => {
    try {
      const response = await fetch(
        `/api/forms/${formId}/questions/${questionId}/move-down`,
        {
          method: "PATCH",
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to move question down");
      }

      // Refetch questions to get updated order
      const questionsResponse = await fetch(`/api/forms/${formId}/questions`);
      const questionsResult = await questionsResponse.json();

      if (questionsResult.success) {
        setQuestions(questionsResult.data || []);
      }
    } catch (err: any) {
      console.error("Failed to move question down:", err.message);
      alert("Failed to move question down: " + err.message);
    }
  };

  const handleSaveQuestion = async () => {
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

      if (editingQuestion) {
        // Update existing question
        const response = await fetch(
          `/api/forms/${formId}/questions/${editingQuestion.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              questionType: selectedQuestionType,
              questionTitle: questionTitle.trim(),
              optionsCategory,
              qorder: editingQuestion.qorder,
            }),
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to update question");
        }

        setQuestions(
          questions.map((q) => (q.id === editingQuestion.id ? result.data : q))
        );
      } else {
        // Add new question
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
      }

      closeModal();
    } catch (err: any) {
      console.error("Failed to save question:", err.message);
      alert("Failed to save question: " + err.message);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToForms}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <svg
            className="w-4 h-4"
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

        {/* Outer Form Border */}
        <div className="border-2 border-gray-300 rounded-lg bg-white p-8">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                  {formData?.name || "Untitled Form"}
                </h1>
              </div>
              <div className="relative z-20" ref={dropdownRef}>
                <button
                  onClick={handleAddComponent}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-all"
                >
                  Add Question
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
                    <button
                      onClick={() => openModal("multiple_choice")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Multiple Choice
                    </button>
                    <button
                      onClick={() => openModal("text_answer")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Text Answer
                    </button>
                    <button
                      onClick={() => openModal("linear_scale")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Linear Scale
                    </button>
                  </div>
                )}
              </div>
            </div>
            {formData?.description && (
              <p className="text-gray-600 text-lg mt-2">
                {formData.description}
              </p>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {questions.length === 0 ? (
              <div className="bg-gray-50 rounded-lg border-2 border-gray-300 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No questions yet
                </h3>
                <p className="text-gray-500 text-sm">
                  Get started by adding your first question
                </p>
              </div>
            ) : (
              questions.map((question, index) => (
                <div key={question.id} className="relative group">
                  {/* Question Border */}
                  <div className="border-2 border-gray-300 rounded-lg p-6 bg-white">
                    {/* Question Number Badge */}
                    <div className="absolute -left-4 top-6 w-8 h-8 bg-gray-900 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {index + 1}
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {/* Move Up Button */}
                      {index > 0 && (
                        <button
                          onClick={() => handleMoveUp(question.id)}
                          className="p-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                          title="Move Up"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Move Down Button */}
                      {index < questions.length - 1 && (
                        <button
                          onClick={() => handleMoveDown(question.id)}
                          className="p-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                          title="Move Down"
                        >
                          <svg
                            className="w-4 h-4"
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
                      )}

                      <button
                        onClick={() => openEditModal(question)}
                        className="p-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                        title="Edit"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="p-1.5 bg-white border border-gray-300 text-red-600 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Question Component */}
                    {question.questionType === "multiple_choice" && (
                      <MultipleChoiceQuestion question={question} />
                    )}
                    {question.questionType === "linear_scale" && (
                      <LinearScaleQuestion question={question} />
                    )}
                    {question.questionType === "text_answer" && (
                      <TextAnswerQuestion question={question} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingQuestion ? "Edit" : "Add"} Question
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedQuestionType.replace("_", " ")}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Question Title */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Question Title
                </label>
                <input
                  type="text"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter your question"
                />
              </div>

              {/* Multiple Choice Options */}
              {selectedQuestionType === "multiple_choice" && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Answer Choices
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
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          placeholder={`Choice ${index + 1}`}
                        />
                        {mcChoices.length > 2 && (
                          <button
                            onClick={() => removeMcChoice(index)}
                            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addMcChoice}
                    className="mt-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    + Add choice
                  </button>
                </div>
              )}

              {/* Linear Scale Options */}
              {selectedQuestionType === "linear_scale" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        From
                      </label>
                      <input
                        type="number"
                        value={scaleMin}
                        onChange={(e) => setScaleMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        To
                      </label>
                      <input
                        type="number"
                        value={scaleMax}
                        onChange={(e) => setScaleMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Min label (optional)
                      </label>
                      <input
                        type="text"
                        value={scaleMinLabel}
                        onChange={(e) => setScaleMinLabel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Not at all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Max label (optional)
                      </label>
                      <input
                        type="text"
                        value={scaleMaxLabel}
                        onChange={(e) => setScaleMaxLabel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Extremely"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                {editingQuestion ? "Save changes" : "Add question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
