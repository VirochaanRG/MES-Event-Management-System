// src/routes/forms/$formId.tsx
import { Form, FormQuestion } from "@/interfaces/interfaces";
import { createFileRoute } from "@tanstack/react-router";
import { useParams } from "@tanstack/react-router";
import { JSX, useEffect, useState } from "react";


// Define the type for route params
interface FormParams {
  formId: string;
}


function FormPage() {
  const { formId } = Route.useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForm() {
      try {
        const [formRes, questionsRes] = await Promise.all([
          fetch(`http://localhost:3114/api/forms/${formId}`, { credentials: "include" }),
          fetch(`http://localhost:3114/api/forms/${formId}/questions`, { credentials: "include" }),
        ]);

        const formData = await formRes.json();
        const questionsData = await questionsRes.json();

        if (formData.success) setForm(formData.data);
        if (questionsData.success) setQuestions(questionsData.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [formId]);

  if (loading) {
    return <p className="text-center mt-12 text-gray-600">Loading...</p>;
  }

  if (!form) {
    return <p className="text-center mt-12 text-red-600">Form not found</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-red-900 mb-2">{form.name}</h1>
      <p className="text-gray-600 mb-6">{form.description}</p>

      {questions.map((q) => (
        <div key={q.id} className="mb-6">
          <h3 className="font-semibold text-lg text-red-900 mb-2">
            {q.questionTitle}
          </h3>

          {/* Render question based on type */}
          {q.questionType === "multiple_choice" && q.optionsCategory && (
            <div className="flex flex-col gap-2">
              {JSON.parse(q.optionsCategory).choices.map((choice: string, idx: number) => (
                <label key={idx} className="flex items-center gap-2">
                  <input type="radio" name={`q-${q.id}`} value={choice} />
                  {choice}
                </label>
              ))}
            </div>
          )}

          {q.questionType === "text_answer" && (
            <textarea
              className="w-full border border-gray-300 rounded-md p-2"
              name={`q-${q.id}`}
              rows={3}
            />
          )}

          {q.questionType === "linear_scale" && q.optionsCategory && (
            <div className="flex items-center gap-2">
              {(() => {
                const opts = JSON.parse(q.optionsCategory);
                const scale: JSX.Element[] = [];
                for (let i = opts.min; i <= opts.max; i++) {
                  scale.push(
                    <label key={i} className="flex flex-col items-center">
                      <input type="radio" name={`q-${q.id}`} value={i} />
                      <span>{i}</span>
                    </label>
                  );
                }
                return scale;
              })()}
              <div className="ml-4 text-sm text-gray-500 flex flex-col items-start">
                <span>{JSON.parse(q.optionsCategory).minLabel}</span>
                <span>{JSON.parse(q.optionsCategory).maxLabel}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/forms/$formId")({
  component: FormPage,
});
