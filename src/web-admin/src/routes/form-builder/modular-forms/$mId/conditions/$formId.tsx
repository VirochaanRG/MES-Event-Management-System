import AdminLayout from "@/components/AdminLayout";
import { Form, FormCondition, FormQuestion} from "@/interfaces/interfaces";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, use } from "react";
export const Route = createFileRoute("/form-builder/modular-forms/$mId/conditions/$formId")({
   component: () => {
    const { formId } = Route.useParams();
    return <RouteComponent key={formId} />;
  },
});

function RouteComponent() {

  const navigate = useNavigate();
  const { mId, formId} = Route.useParams();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [allForms, setAllForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conditions, setConditions] = useState<FormCondition[]>([]);
  const [selectedConditionType, setSelectedConditionType] = useState<string>("");
  const [selectedParentForm, setSelectedParentForm] = useState<Form | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<FormQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [editingCondition, setEditingCondition] = useState<FormCondition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFormAndConditions = async () => {
      try {
        setLoading(true);
        const formRes = await fetch(`/api/forms/${formId}`);
        const formData = await formRes.json();
        const conditionsRes = await fetch(`/api/forms/${formId}/conditions`);
        const conditionsData = await conditionsRes.json();
        const allFormsRes = await fetch(`/api/mod-forms/sub-forms/${mId}`);
        const allFormsData = await allFormsRes.json();

        if (!formData.success) throw new Error(formData.error || 'Failed to fetch form');
        if (!conditionsData.success) throw new Error(formData.error || 'Failed to fetch conditions');
        if (!allFormsData.success) throw new Error(allFormsData.error || 'Failed to fetch form')

        setForm(formData.data);
        setAllForms(allFormsData.data.filter(f => f.id !== parseInt(formId)));
        setConditions(conditionsData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFormAndConditions();
  }, [formId, mId]);

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
  
  const handleBack = () => {
    if(form?.moduleId) {
      navigate({ to: `/form-builder/modular-forms/${form.moduleId}` });
    } else {
      navigate({ to: "/form-builder" });
    }
  };
  
  const openModal = (conditionType) => {
    setSelectedConditionType(conditionType);
    setSelectedParentForm(null);
    setSelectedQuestion(null);
    setSelectedAnswer(null);
    setEditingCondition(null);
    setIsModalOpen(true);
  };

  const openEditModal = (condition) => {
    setSelectedConditionType(condition.conditionType);
    const parentForm = allForms.find(
      f => f.id === condition.dependentFormId
    ) ?? null;
    setSelectedParentForm(parentForm);
    setSelectedQuestion(condition.dependentQuestionId);
    setSelectedAnswer(condition.dependentAnswerIdx);
    setEditingCondition(condition)
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  }

  const handleAddCondition = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const handleDeleteCondition = async (id) => {
    if (!confirm("Are you sure you want to delete this condition?")) {
      return;
    }
    try {
      const response = await fetch(
        `/api/forms/${formId}/conditions/${id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete condition");
      }

      setConditions(conditions.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error("Failed to delete condition:", err.message);
      alert("Failed to delete condition: " + err.message);
    }
  };

  const handleSaveCondition = async () => {
    try {
      if(!selectedParentForm) {
        alert("Must select a form"); return;
      }
      let body;
      if (selectedConditionType === "complete_form") {
        body = JSON.stringify({
          conditionType: selectedConditionType,
          dependentFormId: selectedParentForm.id,
        });
      } else if (selectedConditionType === "answer_question") {
        if(!selectedQuestion) {
          alert("Must select a question"); return;
        }
        body = JSON.stringify({
          conditionType: selectedConditionType,
          dependentFormId: selectedParentForm.id,
          dependentQuestionId : selectedQuestion.id,
        });
      } else if (selectedConditionType === "specific_answer") {
        if(!selectedQuestion) {
          alert("Must select a question"); return;
        } else if(!selectedAnswer) {
          alert("Must select an answer"); return;
        }
        body = JSON.stringify({
          conditionType: selectedConditionType,
          dependentFormId: selectedParentForm.id,
          dependentQuestionId : selectedQuestion.id,
          dependentAnswerIdx : selectedAnswer,
        });
      }
      console.log(selectedConditionType);
      let result;
      if (editingCondition) {
        // Update existing question
        console.log("Editing " + editingCondition.id);
        const response = await fetch(
          `/api/forms/${formId}/conditions/${editingCondition.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: body
          },
        );

        result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Failed to update condition");
        }

        setConditions(
          conditions.map((c) => (c.id === editingCondition.id ? result.data : c)),
        );
      } else {
        console.log(form);
        console.log(selectedParentForm);
        const response = await fetch(`/api/forms/${formId}/conditions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: body
        });

        result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to add condition");
        }

        setConditions([...conditions, result.data]);
      }

      closeModal();
    } catch (err: any) {
      console.error("Failed to save condition:", err.message);
      alert("Failed to save condition: " + err.message);
    }
  }

  if (loading) return <div className="text-center py-12">Loading conditions...</div>;
  if (error || !form) return <div className="text-center py-12 text-red-600">{error || "Form not found"}</div>;
  if(!currentUser) return null;

  const getConditionText = (condition) => {
    const dependentForm = allForms.find(f => f.id === condition.dependentFormId);
    if(!dependentForm) return "";
    if(condition.conditionType === 'complete_form') {
      return "Must complete " + dependentForm.name + " to unlock";
    } else if (condition.conditionType === 'answer_question') {
      //TODO
      return "TODO"
    } else if (condition.conditionType === 'specific_answer') {
      //TODO
      return "TODO"
    }
  }

  return (
    <AdminLayout
        user={currentUser}
        title="Form Builder"
        subtitle="Create and edit forms"
    >
    <div className="min-h-screen p-6 bg-gray-50">
        {/* Back Button */}
        <button
          onClick={handleBack}
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
          Back to modules
        </button>
        {/* Outer Form Border */}
        <div className="border-2 border-gray-300 rounded-lg bg-white p-8">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">Conditions for: {form.name}</h1>
                <p className="text-gray-700 mb-6">{form.description || "No description"}</p>
              </div>
              <div className="relative z-20" ref={dropdownRef}>
                <button
                  onClick={handleAddCondition}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-all"
                >
                  Add Condition
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-30">
                    <button
                      onClick={() => openModal("complete_form")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Complete Form
                    </button>
                    <button
                      onClick={() => openModal("answer_question")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Answer Question
                    </button>
                    <button
                      onClick={() => openModal("specific_answer")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Specific Answer
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Conditions list */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              {conditions?.length > 0 ?
                (conditions.map((condition) => (
                    <div key={condition.id} className="relative group">
                      {/* Question Border */}
                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(condition)}
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
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteCondition(condition.id)}
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
                        <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="text-sm text-teal-600 font-medium mb-2">
                                {condition.conditionType === "complete_form" ? "COMPLETE A FORM" : 
                                 condition.conditionType === "answer_question" ? "ANSWER A QUESTION" : 
                                condition.conditionType === "specific_answer" ? "GIVE A SPECIFIC ANSWER" : 
                                "INVALID CONDITION"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-black">
                              {getConditionText(condition)}
                            </p>
                          </div>
                        </div>
                      </div>
                  ))
                )
               : <p className="text-gray-500">No conditions found</p>}
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
                      TODO: TITLE OF MODAL
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedConditionType.replace("_", " ")}
                    </p>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Dependent Form */}
                    <div className="flex flex-col mb-4">
                      <label
                        htmlFor="form"
                        className="mb-1 text-sm font-medium text-gray-900"
                      >
                        Form
                      </label>
                      <select
                        name="form"
                        id="form"
                        value={selectedParentForm?.id ?? ""}
                        onChange={(e) => {
                          const parentForm = allForms.find(f => parseInt(e.target.value) === f.id);
                          if(parentForm) setSelectedParentForm(parentForm);
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                                  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500
                                  text-gray-700 bg-white"
                      >
                      <option value="" disabled>
                        Select a form
                      </option>
                        { allForms.length > 0 ? 
                          (allForms.map(f => {
                            return (
                            <option 
                              value={f.id}>
                              {f.name}
                            </option>);
                          }))
                        : (<option value="no_forms_found" disabled>
                          No applicable forms found
                        </option>)}
                      </select>
                    </div>

                    {/* Dependent Question */}
                    {(selectedConditionType === "answer_question"  || selectedConditionType === "specific_answer") && (<div className="flex flex-col mb-4">
                      <label
                        htmlFor="question"
                        className="mb-1 text-sm font-medium text-gray-900"
                      >
                        Question
                      </label>
                      <select
                        name="question"
                        id="question"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                                  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500
                                  text-gray-700 bg-white"
                      >
                        <option value="no_questions_found" disabled>
                          No applicable questions found
                        </option>
                      </select>
                    </div>)}

                    {/* Dependent Answer */}
                    {selectedConditionType === "specific_answer" && (<div className="flex flex-col mb-4">
                      <label
                        htmlFor="answer"
                        className="mb-1 text-sm font-medium text-gray-900"
                      >
                        Answer
                      </label>
                      <select
                        name="answer"
                        id="answer"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                                  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500
                                  text-gray-700 bg-white"
                      >
                        <option value="no_answers_found" disabled>
                          No applicable answers found
                        </option>
                      </select>
                    </div>)}
                  </div>
                  <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCondition}
                      className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800"
                    >
                      {editingCondition ? "Save changes" : "Add condition"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
