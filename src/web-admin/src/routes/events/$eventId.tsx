import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormQuestion } from "@/interfaces/interfaces";
import MultipleChoiceQuestion from "@/components/MultipleChoiceQuestion";
import { MultiSelectQuestion } from "@/components/MultiSelectQuestion";
import { TextAnswerQuestion } from "@/components/TextAnswerQuestion";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetail,
});

type QuestionType = "multiple_choice" | "multi_select" | "text_answer";

interface QuestionFormData {
  id?: string;
  question_type: QuestionType;
  label: string;
  options?: string[];
  required: boolean;
  qorder?: string;
  min?: number;
  max?: number;
}

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionFormData>({
    question_type: "text_answer",
    label: "",
    options: [],
    required: false,
  });
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [optionInput, setOptionInput] = useState("");

  const handleBack = () => {
    navigate({ to: "/events" });
  };

  const {
    data: registeredList,
    isLoading: isLoadingRegistrations,
    error: registrationsError,
  } = useQuery({
    queryKey: ["eventRegistrations", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/registrationlist`);
      if (!response.ok) throw new Error("Failed to fetch registrations");
      const json = await response.json();
      return json.data;
    },
  });

  const {
    data: registrationForm,
    isLoading: isLoadingForm,
    error: formError,
  } = useQuery({
    queryKey: ["eventRegistrationForm", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/registration-form`);
      if (!response.ok) throw new Error("Failed to fetch registration form");
      const json = await response.json();
      return json.questions as FormQuestion[];
    },
  });

  const updateFormMutation = useMutation({
    mutationFn: async (formData: { questions: QuestionFormData[] }) => {
      const response = await fetch(`/api/events/${eventId}/registration-form`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationForm: { questions: formData.questions },
        }),
      });
      if (!response.ok) throw new Error("Failed to update registration form");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["eventRegistrationForm", eventId],
      });
      setIsModalOpen(false);
      setQuestions([]);
    },
  });

  const openModal = () => {
    // Load existing questions
    if (registrationForm && registrationForm.length > 0) {
      const existingQuestions: QuestionFormData[] = registrationForm.map(
        (q, idx) => {
          const parsedOptions = q.optionsCategory
            ? JSON.parse(q.optionsCategory)
            : null;
          return {
            id: q.id?.toString(),
            question_type: q.questionType as QuestionType,
            label: q.questionTitle,
            options: parsedOptions?.choices || [],
            required: q.required,
            qorder: (idx + 1).toString(),
            min: parsedOptions?.min,
            max: parsedOptions?.max,
          };
        },
      );
      setQuestions(existingQuestions);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentQuestion({
      question_type: "text_answer",
      label: "",
      options: [],
      required: false,
    });
    setQuestions([]);
    setOptionInput("");
  };

  const addQuestion = () => {
    if (!currentQuestion.label.trim()) {
      alert("Please enter a question title");
      return;
    }

    if (
      (currentQuestion.question_type === "multiple_choice" ||
        currentQuestion.question_type === "multi_select") &&
      (!currentQuestion.options || currentQuestion.options.length === 0)
    ) {
      alert("Please add at least one option");
      return;
    }

    const newQuestion: QuestionFormData = {
      ...currentQuestion,
      qorder: (questions.length + 1).toString(),
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      question_type: "text_answer",
      label: "",
      options: [],
      required: false,
    });
    setOptionInput("");
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const addOption = () => {
    if (!optionInput.trim()) return;

    setCurrentQuestion({
      ...currentQuestion,
      options: [...(currentQuestion.options || []), optionInput.trim()],
    });
    setOptionInput("");
  };

  const removeOption = (index: number) => {
    const updatedOptions =
      currentQuestion.options?.filter((_, i) => i !== index) || [];
    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const saveForm = () => {
    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    updateFormMutation.mutate({ questions });
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...questions];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= questions.length) return;

    [newQuestions[index], newQuestions[newIndex]] = [
      newQuestions[newIndex],
      newQuestions[index],
    ];

    // Update qorder
    newQuestions.forEach((q, idx) => {
      q.qorder = (idx + 1).toString();
    });

    setQuestions(newQuestions);
  };

  if (isLoadingRegistrations) return <p>Loading event...</p>;
  if (registrationsError) return <p>Error loading event</p>;

  return (
    <div className="mt-6">
      <button
        onClick={handleBack}
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
        Back to Events
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-red-900">Registered Users</h2>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Edit Registration Form
        </button>
      </div>

      {isLoadingRegistrations ? (
        <p>Loading registrations...</p>
      ) : registrationsError ? (
        <p>Error</p>
      ) : registeredList && registeredList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Instance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Registered At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registeredList.map((reg: any) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.userEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.instance ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(reg.registeredAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{reg.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.paymentStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No users registered</p>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  Edit Registration Form
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Add Question Section */}
              <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">Add New Question</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Type
                    </label>
                    <select
                      value={currentQuestion.question_type}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          question_type: e.target.value as QuestionType,
                          options:
                            e.target.value === "text_answer"
                              ? []
                              : currentQuestion.options,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="text_answer">Text Answer</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="multi_select">Multi Select</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Title
                    </label>
                    <input
                      type="text"
                      value={currentQuestion.label}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          label: e.target.value,
                        })
                      }
                      placeholder="Enter your question"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentQuestion.required}
                      onChange={(e) =>
                        setCurrentQuestion({
                          ...currentQuestion,
                          required: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Required Question
                    </label>
                  </div>

                  {currentQuestion.question_type === "multi_select" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Selections
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={currentQuestion.min || 0}
                          onChange={(e) =>
                            setCurrentQuestion({
                              ...currentQuestion,
                              min: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Selections (leave empty for no limit)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={currentQuestion.max || ""}
                          onChange={(e) =>
                            setCurrentQuestion({
                              ...currentQuestion,
                              max: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {(currentQuestion.question_type === "multiple_choice" ||
                    currentQuestion.question_type === "multi_select") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Options
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={optionInput}
                          onChange={(e) => setOptionInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addOption();
                            }
                          }}
                          placeholder="Enter an option"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={addOption}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {currentQuestion.options?.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded"
                          >
                            <span>{option}</span>
                            <button
                              onClick={() => removeOption(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={addQuestion}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Question to Form
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div>
                <h4 className="text-lg font-semibold mb-4">
                  Form Questions ({questions.length})
                </h4>
                {questions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No questions added yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-500">
                                Q{index + 1}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {q.question_type
                                  .replace("_", " ")
                                  .toUpperCase()}
                              </span>
                              {q.required && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                  REQUIRED
                                </span>
                              )}
                            </div>
                            <p className="font-medium">{q.label}</p>
                            {q.options && q.options.length > 0 && (
                              <div className="mt-2 text-sm text-gray-600">
                                Options: {q.options.join(", ")}
                              </div>
                            )}
                            {q.question_type === "multi_select" && (
                              <div className="mt-1 text-xs text-gray-500">
                                Min: {q.min || 0}, Max: {q.max || "No limit"}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => moveQuestion(index, "up")}
                              disabled={index === 0}
                              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveQuestion(index, "down")}
                              disabled={index === questions.length - 1}
                              className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeQuestion(index)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={updateFormMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updateFormMutation.isPending ? "Saving..." : "Save Form"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
