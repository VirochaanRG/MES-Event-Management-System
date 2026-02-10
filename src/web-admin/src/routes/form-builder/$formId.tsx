import AdminLayout from "@/components/AdminLayout";
import { LinearScaleQuestion } from "@/components/LinearScaleQuestion";
import MultipleChoiceQuestion from "@/components/MultipleChoiceQuestion";
import MultiSelectQuestion from "@/components/MultiSelectQuestion";
import { TextAnswerQuestion } from "@/components/TextAnswerQuestion";
import { Form, FormQuestion } from "@/interfaces/interfaces";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/form-builder/$formId")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const { formId } = Route.useParams();
  const [formData, setFormData] = useState<Form | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const handleTogglePublic = async (nextValue: boolean) => {
    if (!formData) return;

    const prev = formData.isPublic;

    // optimistic update
    setFormData({ ...formData, isPublic: nextValue });
    setSavingVisibility(true);

    try {
      const res = await fetch(`/api/forms/${formId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextValue }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.error || "Failed to update visibility");
      }

      setFormData(json.data);
    } catch (err: any) {
      // revert if it fails
      setFormData({ ...formData, isPublic: prev });
      alert(err?.message || "Failed to update visibility");
    } finally {
      setSavingVisibility(false);
    }
  };
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(
    null,
  );
  const [openFollowupFor, setOpenFollowupFor] = useState<number | null>(null);
  const [followupParentId, setFollowupParentId] = useState<number | null>(null);
  const [selectedTriggers, setSelectedTriggers] = useState<number[]>([]);
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [required, setRequired] = useState(false);
  const [mcChoices, setMcChoices] = useState<string[]>(["", ""]);
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(5);
  const [selectionsMin, setSelectionsMin] = useState<number>(0);
  const [selectionsMax, setSelectionsMax] = useState<number | null>(null);
  const [scaleMinLabel, setScaleMinLabel] = useState("");
  const [scaleMaxLabel, setScaleMaxLabel] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allowedTypesForFollowUp = ["multiple_choice", "linear_scale"];

  useEffect(() => {
    const initAuth = () => {
      const sessionUser = getCurrentUser("admin");
      if (sessionUser) {
        if (sessionUser.roles && sessionUser.roles.includes("admin")) {
          setCurrentUser(sessionUser);
        } else {
          console.error("User does not have admin role");
          logout("admin");
          navigate({ to: "/" });
        }
      } else {
        navigate({ to: "/" });
      }
      setLoading(false);
    };

    initAuth();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking a button inside the dropdown
      if (target.tagName === "BUTTON") {
        return;
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setOpenFollowupFor(null);
      }
    };

    if (isDropdownOpen || openFollowupFor) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, openFollowupFor]);

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
    setFollowupParentId(null);
    setSelectedTriggers([]);
    setSelectedQuestionType(questionType);
    setQuestionTitle("");
    setMcChoices(["", ""]);
    setScaleMin(1);
    setScaleMax(5);
    setScaleMinLabel("");
    setScaleMaxLabel("");
    setIsDropdownOpen(false);
    setIsModalOpen(true);
    setOpenFollowupFor(null);
  };

  const openFollowUpModal = (
    questionType: string,
    parentQuestionId: number,
  ) => {
    openModal(questionType);
    setFollowupParentId(parentQuestionId);
  };

  const openEditModal = (question: FormQuestion) => {
    setEditingQuestion(question);
    console.log(question.parentQuestionId);
    setFollowupParentId(question.parentQuestionId);
    setSelectedQuestionType(question.questionType);
    setQuestionTitle(question.questionTitle || "");
    setRequired(question.required);
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
      setScaleMin(parsed.min || 1);
      setScaleMax(parsed.max || 5);
      setScaleMinLabel(parsed.minLabel || "");
      setScaleMaxLabel(parsed.maxLabel || "");
    } else if (
      question.questionType === "multi_select" &&
      question.optionsCategory
    ) {
      const parsed = JSON.parse(question.optionsCategory);
      setMcChoices(parsed.choices || ["", ""]);
      setSelectionsMin(parsed.min);
      setSelectionsMax(parsed.max);
    }
    if (question.parentQuestionId && question.enablingAnswers) {
      setSelectedTriggers(question.enablingAnswers);
    } else {
      setSelectedTriggers([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedQuestionType("");
    setEditingQuestion(null);
    setFollowupParentId(null);
    setSelectedTriggers([]);
    setOpenFollowupFor(null);
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
        },
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
        },
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
        },
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

      if (followupParentId && selectedTriggers.length == 0) {
        alert("Please select atleast one answer to follow up to");
        return;
      }

      let optionsCategory = "";

      if (selectedQuestionType === "multiple_choice") {
        const validChoices = mcChoices.filter((c) => c.trim() !== "");
        if (validChoices.length < 2) {
          alert("Please provide at least 2 choices");
          return;
        }
        if (new Set(validChoices).size !== validChoices.length) {
          alert("Duplicate choices are not allowed");
          return;
        }
        optionsCategory = JSON.stringify({ choices: validChoices });
      } else if (selectedQuestionType === "linear_scale") {
        optionsCategory = JSON.stringify({
          min: scaleMin,
          max: scaleMax,
          minLabel: scaleMinLabel,
          maxLabel: scaleMaxLabel,
          choices: Array.from(
            { length: scaleMax - scaleMin + 1 },
            (_, i) => scaleMin + i,
          ),
        });
      } else if (selectedQuestionType === "multi_select") {
        const validChoices = mcChoices.filter((c) => c.trim() !== "");
        if (validChoices.length < 2) {
          alert("Please provide at least 2 choices");
          return;
        }
        if (new Set(validChoices).size !== validChoices.length) {
          alert("Duplicate choices are not allowed");
          return;
        }
        optionsCategory = JSON.stringify({
          choices: validChoices,
          min: selectionsMin >= 0 ? selectionsMin : 0,
          max:
            (selectionsMax ?? Infinity) < validChoices.length
              ? selectionsMax
              : null,
        });
      }

      let result;
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
              parentQuestionId: followupParentId || undefined,
              enablingAnswers: selectedTriggers || [],
              required: required,
            }),
          },
        );

        result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to update question");
        }

        setQuestions(
          questions.map((q) => (q.id === editingQuestion.id ? result.data : q)),
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
            parentQuestionId: followupParentId || undefined,
            enablingAnswers: selectedTriggers || [],
            required: required,
          }),
        });

        result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to add question");
        }

        setQuestions([...questions, result.data]);
      }

      closeModal();
      setOpenFollowupFor(null); // ADD THIS LINE - Reset follow-up dropdown state after saving
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
  if (!currentUser) {
    return null;
  }
  return (
    <AdminLayout
      user={currentUser}
      title="Form Builder"
      subtitle="Create and edit forms"
    >
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

                {/* Make public checkbox */}
                <div className="mt-3 flex items-center gap-3">
                  <input
                    id="makePublic"
                    type="checkbox"
                    checked={!!formData?.isPublic}
                    disabled={savingVisibility}
                    onChange={(e) => handleTogglePublic(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50"
                  />
                  <label htmlFor="makePublic" className="text-sm font-medium text-gray-900">
                    Make public
                  </label>

                  <span className="text-xs text-gray-500">
                    {formData?.isPublic ? "Public" : "Private"}
                  </span>
                </div>
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
                    <button
                      onClick={() => openModal("multi_select")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Multiple Selection
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
                {/* <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
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
                </div> */}
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No questions
                </h3>
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

                      {/* Add Follow-up Button */}
                      {allowedTypesForFollowUp.includes(
                        question.questionType,
                      ) && (
                        <div className="relative" ref={dropdownRef}>
                          <button
                            onClick={() =>
                              setOpenFollowupFor(
                                openFollowupFor === question.id
                                  ? null
                                  : question.id,
                              )
                            }
                            className="p-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                            title="Add follow-up question"
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
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>

                          {openFollowupFor === question.id && (
                            <div
                              className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30"
                              ref={dropdownRef}
                            >
                              <span className="w-full text-left px-4 py-2 text-sm text-gray-400 italic">
                                Add a follow-up question
                              </span>
                              <button
                                onClick={() =>
                                  openFollowUpModal(
                                    "multiple_choice",
                                    question.id,
                                  )
                                }
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Multiple Choice
                              </button>
                              <button
                                onClick={() =>
                                  openFollowUpModal("text_answer", question.id)
                                }
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Text Answer
                              </button>
                              <button
                                onClick={() =>
                                  openFollowUpModal("linear_scale", question.id)
                                }
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Linear Scale
                              </button>
                            </div>
                          )}
                        </div>
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
                      <MultipleChoiceQuestion
                        question={question}
                        questionsList={questions}
                      />
                    )}
                    {question.questionType === "linear_scale" && (
                      <LinearScaleQuestion
                        question={question}
                        questionsList={questions}
                      />
                    )}
                    {question.questionType === "text_answer" && (
                      <TextAnswerQuestion
                        question={question}
                        questionsList={questions}
                      />
                    )}
                    {question.questionType === "multi_select" && (
                      <MultiSelectQuestion
                        question={question}
                        questionsList={questions}
                      />
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
          <div
            role="dialog"
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingQuestion ? "Edit" : "Add"}{" "}
                {followupParentId ? "Follow-up" : ""} Question
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedQuestionType.replace("_", " ")}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Required Question */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="required"
                  className="text-sm font-medium text-gray-900"
                >
                  Required Question
                </label>
                <input
                  type="checkbox"
                  id="required"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
              </div>

              {/* Follow up answers */}
              {followupParentId &&
                (() => {
                  const parentQuestion = questions.find(
                    (q) => q.id === followupParentId,
                  );
                  const answers = parentQuestion?.optionsCategory
                    ? JSON.parse(parentQuestion.optionsCategory).choices
                    : [];

                  if (!parentQuestion) return null;
                  if (
                    !allowedTypesForFollowUp.includes(
                      parentQuestion.questionType,
                    )
                  )
                    return null;

                  return (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Show question when answering with...
                      </label>

                      <div className="space-y-2">
                        {answers?.map((answer, index) => (
                          <label
                            key={index}
                            className="flex items-center gap-3 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              value={index} // store the index
                              checked={
                                selectedTriggers?.includes(index) || false
                              } // check against index
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedTriggers((prev) => {
                                  if (checked) {
                                    // add index if not already in array
                                    return prev ? [...prev, index] : [index];
                                  } else {
                                    // remove index
                                    return (prev || []).filter(
                                      (i) => i !== index,
                                    );
                                  }
                                });
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <span className="truncate">{answer}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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
                        onChange={(e) => setScaleMin(parseInt(e.target.value))}
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
                        onChange={(e) => setScaleMax(parseInt(e.target.value))}
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

              {/* Multi Select Options */}
              {selectedQuestionType === "multi_select" && (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Minimum required selections
                      </label>
                      <input
                        min={0}
                        type="number"
                        value={selectionsMin}
                        onChange={(e) =>
                          setSelectionsMin(parseInt(e.target.value ?? "0"))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Maximum required selections
                      </label>
                      <input
                        min={1}
                        type="number"
                        value={selectionsMax ?? ""}
                        onChange={(e) =>
                          setSelectionsMax(parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>
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
    </AdminLayout>
  );
}
