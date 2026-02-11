import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormQuestion } from "@/interfaces/interfaces";

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

interface RegistrationDetail {
  question: string;
  answer: string | string[];
  questionType: string;
}

interface Registration {
  id: number;
  userEmail: string;
  instance: number;
  registeredAt: string;
  status: string;
  paymentStatus: string;
  details: RegistrationDetail[] | null;
}

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);
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
      return json.data as Registration[];
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

    newQuestions.forEach((q, idx) => {
      q.qorder = (idx + 1).toString();
    });

    setQuestions(newQuestions);
  };

  const openDetailsModal = (registration: Registration) => {
    setSelectedRegistration(registration);
  };

  const closeDetailsModal = () => {
    setSelectedRegistration(null);
  };

  const formatAnswer = (answer: string | string[]) => {
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    return answer;
  };

  if (isLoadingRegistrations) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
        <p className="text-lg text-slate-700 font-medium">
          Loading event details...
        </p>
      </div>
    );
  }

  if (registrationsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
        <p className="text-lg text-red-700 font-semibold">
          Error loading event
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-8 flex items-center gap-2 text-red-900 hover:text-red-700 transition-colors font-semibold group"
        >
          <svg
            className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
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

        <div className="bg-white rounded-2xl shadow-xl border-t-4 border-red-900 p-8 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-red-900 mb-2">
                Event Registrations
              </h2>
              <p className="text-slate-600">
                Manage and view all registered attendees
              </p>
            </div>
            <button
              onClick={openModal}
              className="px-6 py-3 bg-red-900 text-white font-bold rounded-lg hover:bg-red-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Edit Registration Form
            </button>
          </div>

          {isLoadingRegistrations ? (
            <div className="text-center py-12">
              <p className="text-slate-500">Loading registrations...</p>
            </div>
          ) : registrationsError ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-semibold">
                Error loading registrations
              </p>
            </div>
          ) : registeredList && registeredList.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-red-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Instance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Registered At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {registeredList.map((reg) => (
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        {reg.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                        {reg.instance ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                        {new Date(reg.registeredAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                            reg.paymentStatus === "paid"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200"
                          }`}
                        >
                          {reg.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openDetailsModal(reg)}
                          className="text-red-900 hover:text-red-700 font-semibold text-sm underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg">
              <svg
                className="mx-auto h-12 w-12 text-slate-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-slate-500 text-lg font-medium">
                No users registered yet
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Registrations will appear here once users sign up
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Details Modal */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-red-900 text-white p-6 z-10 border-b-4 border-slate-800">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Registration Details</h3>
                  <p className="text-slate-200 text-sm mt-1">
                    {selectedRegistration.userEmail}
                  </p>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="text-white hover:text-slate-200 transition-colors"
                >
                  <svg
                    className="w-7 h-7"
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

            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
              {/* Registration Info */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border-l-4 border-red-900">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">
                      Status
                    </p>
                    <p className="text-slate-900 font-medium mt-1">
                      {selectedRegistration.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">
                      Payment
                    </p>
                    <p className="text-slate-900 font-medium mt-1">
                      {selectedRegistration.paymentStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">
                      Instance
                    </p>
                    <p className="text-slate-900 font-medium mt-1">
                      {selectedRegistration.instance ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">
                      Registered
                    </p>
                    <p className="text-slate-900 font-medium mt-1">
                      {new Date(
                        selectedRegistration.registeredAt,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Responses */}
              <div>
                <h4 className="text-lg font-bold text-red-900 mb-4">
                  Form Responses
                </h4>
                {selectedRegistration.details &&
                selectedRegistration.details.length > 0 ? (
                  <div className="space-y-4">
                    {selectedRegistration.details.map((detail, index) => (
                      <div
                        key={index}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <p className="text-sm font-semibold text-slate-700 mb-2">
                          {detail.question}
                        </p>
                        <div className="text-slate-900 font-medium">
                          {Array.isArray(detail.answer) ? (
                            <ul className="list-disc list-inside space-y-1">
                              {detail.answer.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>{detail.answer}</p>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Type: {detail.questionType.replace("_", " ")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <p className="text-slate-500">
                      No form responses available
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-200 p-6 flex justify-end">
              <button
                onClick={closeDetailsModal}
                className="px-6 py-3 bg-red-900 text-white font-bold rounded-lg hover:bg-red-800 transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-red-900 text-white p-6 z-10 border-b-4 border-slate-800">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Edit Registration Form</h3>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-slate-200 transition-colors"
                >
                  <svg
                    className="w-7 h-7"
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

            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              {/* Add Question Section */}
              <div className="mb-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
                <h4 className="text-lg font-bold text-red-900 mb-4">
                  Add New Question
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
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
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
                    >
                      <option value="text_answer">Text Answer</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="multi_select">Multi Select</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
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
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
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
                      className="w-5 h-5 text-red-900 border-slate-300 rounded focus:ring-red-900"
                    />
                    <label className="ml-2 text-sm font-medium text-slate-800">
                      Required Question
                    </label>
                  </div>

                  {currentQuestion.question_type === "multi_select" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">
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
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">
                          Maximum Selections
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
                          placeholder="No limit"
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {(currentQuestion.question_type === "multiple_choice" ||
                    currentQuestion.question_type === "multi_select") && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2">
                        Options
                      </label>
                      <div className="flex gap-2 mb-3">
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
                          className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
                        />
                        <button
                          onClick={addOption}
                          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
                        >
                          Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {currentQuestion.options?.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white border-2 border-slate-200 rounded-lg"
                          >
                            <span className="font-medium text-slate-800">
                              {option}
                            </span>
                            <button
                              onClick={() => removeOption(index)}
                              className="text-red-600 hover:text-red-800 font-semibold transition-colors"
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
                    className="w-full px-6 py-3 bg-red-900 text-white font-bold rounded-lg hover:bg-red-800 transition-all shadow-lg"
                  >
                    Add Question to Form
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div>
                <h4 className="text-lg font-bold text-red-900 mb-4">
                  Form Questions ({questions.length})
                </h4>
                {questions.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <p className="text-slate-500">No questions added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-red-900 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-1 rounded">
                                Q{index + 1}
                              </span>
                              <span className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded-full font-semibold">
                                {q.question_type
                                  .replace("_", " ")
                                  .toUpperCase()}
                              </span>
                              {q.required && (
                                <span className="text-xs px-3 py-1 bg-slate-800 text-white rounded-full font-semibold">
                                  REQUIRED
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900">
                              {q.label}
                            </p>
                            {q.options && q.options.length > 0 && (
                              <div className="mt-2 text-sm text-slate-600">
                                <span className="font-medium">Options:</span>{" "}
                                {q.options.join(", ")}
                              </div>
                            )}
                            {q.question_type === "multi_select" && (
                              <div className="mt-1 text-xs text-slate-500">
                                Min: {q.min || 0}, Max: {q.max || "No limit"}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => moveQuestion(index, "up")}
                              disabled={index === 0}
                              className="p-2 text-slate-600 hover:text-red-900 disabled:opacity-30 font-bold transition-colors"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveQuestion(index, "down")}
                              disabled={index === questions.length - 1}
                              className="p-2 text-slate-600 hover:text-red-900 disabled:opacity-30 font-bold transition-colors"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeQuestion(index)}
                              className="p-2 text-red-600 hover:text-red-800 font-bold transition-colors"
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

            <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-200 p-6 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                disabled={updateFormMutation.isPending}
                className="px-8 py-3 bg-red-900 text-white font-bold rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
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
