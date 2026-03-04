import { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
import { TextAnswerQuestion } from "./TextAnswerQuestion";
import { FormQuestion } from "@/interfaces/interfaces";

export interface FormField {
  id: string;
  type: "text_answer" | "select" | "textarea" | "checkbox" | "number";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  removable: boolean;
}

interface BaseRegistrationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fields: FormField[]) => void;
  initialFields?: FormField[];
}

const DEFAULT_FIELDS: FormField[] = [
  {
    id: "first_name",
    type: "text_answer",
    label: "First Name",
    placeholder: "Enter your first name",
    required: true,
    removable: false,
  },
  {
    id: "last_name",
    type: "text_answer",
    label: "Last Name",
    placeholder: "Enter your last name",
    required: true,
    removable: false,
  },
  {
    id: "email",
    type: "text_answer",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
    removable: false,
  },
];

export default function BaseRegistrationFormModal({
  isOpen,
  onClose,
  onSave,
  initialFields,
}: BaseRegistrationFormModalProps) {
  const [fields, setFields] = useState<FormField[]>(
    initialFields && initialFields.length > 0 ? initialFields : DEFAULT_FIELDS,
  );

  // Reset fields when modal opens with initialFields or defaults
  useEffect(() => {
    if (isOpen) {
      setFields(
        initialFields && initialFields.length > 0
          ? initialFields
          : DEFAULT_FIELDS,
      );
    }
  }, [isOpen, initialFields]);

  if (!isOpen) return null;

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: "",
      placeholder: "",
      required: false,
      removable: true,
      options: type === "select" ? [] : undefined,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field,
      ),
    );
  };

  const removeField = (id: string) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  const handleSave = () => {
    // Validate that all fields have labels
    const allFieldsValid = fields.every((field) => field.label.trim() !== "");
    if (!allFieldsValid) {
      alert("Please provide labels for all fields");
      return;
    }

    // Validate select fields have options
    const selectFieldsValid = fields
      .filter((f) => f.type === "select")
      .every((f) => f.options && f.options.length > 0);
    if (!selectFieldsValid) {
      alert("Please provide options for all dropdown fields");
      return;
    }

    onSave(fields);
    onClose();
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];
    setFields(newFields);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Base Registration Form
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure the registration form for your events
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Default Fields Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> First Name, Last Name, and Email are
                required fields and cannot be removed.
              </p>
            </div>

            {/* Fields List */}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`bg-white border-2 rounded-lg p-4 ${
                    field.removable
                      ? "border-gray-200"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1 pt-2">
                      <button
                        onClick={() => moveField(index, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Field Content */}
                    <div className="flex-1 space-y-3">
                      {/* Field Label and Type */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Field Label{" "}
                            {field.required && (
                              <span className="text-red-600">*</span>
                            )}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Phone Number"
                            value={field.label}
                            onChange={(e) =>
                              updateField(field.id, { label: e.target.value })
                            }
                            disabled={!field.removable}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Field Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(field.id, {
                                type: e.target.value as FormField["type"],
                              })
                            }
                            disabled={!field.removable}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="text_answer">Text Answer</option>
                            <option value="textarea">Long Text</option>
                            <option value="select">Dropdown</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="number">Number</option>
                          </select>
                        </div>
                      </div>

                      {/* Placeholder */}
                      {(field.type === "text_answer" ||
                        field.type === "textarea" ||
                        field.type === "number") && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Placeholder (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., (555) 123-4567"
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              updateField(field.id, {
                                placeholder: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      {/* Options for Select */}
                      {field.type === "select" && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Options (comma-separated)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Option 1, Option 2, Option 3"
                            value={field.options?.join(", ") || ""}
                            onChange={(e) => {
                              const options = e.target.value
                                .split(",")
                                .map((o) => o.trim())
                                .filter(Boolean);
                              updateField(field.id, { options });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      {/* Required Checkbox */}
                      {field.removable && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`required-${field.id}`}
                            checked={field.required}
                            onChange={(e) =>
                              updateField(field.id, {
                                required: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <label
                            htmlFor={`required-${field.id}`}
                            className="text-sm font-medium text-gray-700"
                          >
                            Required field
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    {field.removable && (
                      <div>
                        <button
                          onClick={() => removeField(field.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Field Buttons */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Add New Field
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <button
                  onClick={() => addField("text_answer")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                  Text
                </button>
                <button
                  onClick={() => addField("textarea")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                  Long Text
                </button>
                <button
                  onClick={() => addField("select")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                  Dropdown
                </button>
                <button
                  onClick={() => addField("checkbox")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                  Checkbox
                </button>
                <button
                  onClick={() => addField("number")}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                  Number
                </button>
              </div>
            </div>

            {/* Preview Section */}
            <div className="border-t border-gray-300 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Preview
              </h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                {fields.length > 0 ? (
                  fields.map((field) => (
                    <div key={field.id}>
                      {field.type === "text_answer" && (
                        <TextAnswerQuestion
                          question={
                            {
                              id: field.id,
                              questionTitle: field.label,
                              required: field.required,
                              parentQuestionId: null,
                              enablingAnswers: [],
                            } as FormQuestion
                          }
                          questionsList={[]}
                        />
                      )}
                      {field.type === "textarea" && (
                        <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="text-sm text-purple-600 font-medium mb-2">
                                LONG TEXT
                              </div>
                              <div className="text-lg text-gray-900 font-medium">
                                {field.label}
                              </div>
                            </div>
                            {field.required && (
                              <div className="text-sm text-red-600 font-small mb-2">
                                * Required
                              </div>
                            )}
                          </div>
                          <div className="mt-4">
                            <textarea
                              placeholder={
                                field.placeholder ||
                                "User's answer will appear here..."
                              }
                              disabled
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 resize-none"
                            />
                          </div>
                        </div>
                      )}
                      {field.type === "select" && (
                        <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="text-sm text-purple-600 font-medium mb-2">
                                DROPDOWN
                              </div>
                              <div className="text-lg text-gray-900 font-medium">
                                {field.label}
                              </div>
                            </div>
                            {field.required && (
                              <div className="text-sm text-red-600 font-small mb-2">
                                * Required
                              </div>
                            )}
                          </div>
                          <div className="mt-4">
                            <select
                              disabled
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            >
                              <option value="">Select an option</option>
                              {field.options?.map((option, i) => (
                                <option key={i} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      {field.type === "checkbox" && (
                        <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="text-sm text-purple-600 font-medium mb-2">
                                CHECKBOX
                              </div>
                              <div className="text-lg text-gray-900 font-medium">
                                {field.label}
                              </div>
                            </div>
                            {field.required && (
                              <div className="text-sm text-red-600 font-small mb-2">
                                * Required
                              </div>
                            )}
                          </div>
                          <div className="mt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled
                                className="w-5 h-5 text-red-600 border-gray-300 rounded"
                              />
                              <span className="text-gray-700">I agree</span>
                            </label>
                          </div>
                        </div>
                      )}
                      {field.type === "number" && (
                        <div className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="text-sm text-purple-600 font-medium mb-2">
                                NUMBER
                              </div>
                              <div className="text-lg text-gray-900 font-medium">
                                {field.label}
                              </div>
                            </div>
                            {field.required && (
                              <div className="text-sm text-red-600 font-small mb-2">
                                * Required
                              </div>
                            )}
                          </div>
                          <div className="mt-4">
                            <input
                              type="number"
                              placeholder={
                                field.placeholder || "Enter a number..."
                              }
                              disabled
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No fields added yet. Add fields to see them in the preview.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Save Form
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
