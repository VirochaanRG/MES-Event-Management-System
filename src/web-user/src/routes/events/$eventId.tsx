import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThreeDot } from "react-loading-indicators";
import toast from "react-hot-toast";

export const Route = createFileRoute("/events/$eventId")({
  component: RouteComponent,
});

interface Event {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  isPublic: boolean;
  status: string;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

interface FormQuestion {
  id?: string;
  formId: number;
  questionType: "text_answer" | "multiple_choice" | "multi_select";
  questionTitle: string;
  optionsCategory: string | null;
  qorder: number;
  required: boolean;
}

function RouteComponent() {
  const navigate = useNavigate();
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerStatus, setRegisterStatus] = useState<
    "idle" | "loading" | "registered"
  >("idle");

  // Registration form modal state
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch event");
        }

        setEvent(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleBack = () => {
    navigate({ to: "/" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "ongoing":
        return "bg-green-50 text-green-700 border border-green-200";
      case "completed":
        return "bg-gray-50 text-gray-700 border border-gray-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const openRegistrationForm = async () => {
    if (!user?.email) {
      toast.error("You must be logged in to register for this event");
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch(`/api/events/${eventId}/registration-form`);
      const result = await response.json();

      if (result.success) {
        setFormQuestions(result.questions || []);
        setShowRegistrationForm(true);
      } else {
        toast.error("Failed to load registration form");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load registration form");
    } finally {
      setFormLoading(false);
    }
  };

  const closeRegistrationForm = () => {
    setShowRegistrationForm(false);
    setFormAnswers({});
  };

  const handleInputChange = (questionOrder: string, value: any) => {
    setFormAnswers((prev) => ({
      ...prev,
      [questionOrder]: value,
    }));
  };

  const handleMultiSelectChange = (
    questionOrder: string,
    optionIndex: number,
  ) => {
    setFormAnswers((prev) => {
      const current = prev[questionOrder] || [];
      const newValue = current.includes(optionIndex)
        ? current.filter((i: number) => i !== optionIndex)
        : [...current, optionIndex];
      return {
        ...prev,
        [questionOrder]: newValue,
      };
    });
  };

  const validateForm = () => {
    for (const question of formQuestions) {
      if (question.required) {
        const answer = formAnswers[question.qorder.toString()];

        if (
          answer === null ||
          answer === undefined ||
          (Array.isArray(answer) && answer.length === 0) ||
          answer === ""
        ) {
          toast.error(`Please answer: ${question.questionTitle}`);
          return false;
        }
      }

      // Validate multi-select min/max
      if (
        question.questionType === "multi_select" &&
        question.optionsCategory
      ) {
        const options = JSON.parse(question.optionsCategory);
        const answer = formAnswers[question.qorder.toString()] || [];

        if (options.min && answer.length < options.min) {
          toast.error(
            `${question.questionTitle}: Select at least ${options.min} option(s)`,
          );
          return false;
        }

        if (options.max && answer.length > options.max) {
          toast.error(
            `${question.questionTitle}: Select at most ${options.max} option(s)`,
          );
          return false;
        }
      }
    }
    return true;
  };

  const submitRegistration = async () => {
    if (!validateForm()) {
      return;
    }

    setRegisterStatus("loading");
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user?.email,
          details: formAnswers,
        }),
      });
      const result = await response.json();

      if (result.success) {
        const registrationId = result.data?.id;
        if (registrationId) {
          const qrRes = await fetch(`/api/events/${eventId}/generateQR`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId }),
          });
          const qrJson = await qrRes.json();
          if (qrJson.success) {
            setRegisterStatus("registered");
            toast.success("Registration complete");
            closeRegistrationForm();
            setTimeout(() => handleBack(), 300);
          } else {
            toast.error("QR generation failed");
          }
        }
      } else if (result.error === "User is already registered for this event") {
        toast.error("You are already registered for this event");
        setRegisterStatus("idle");
        closeRegistrationForm();
        setTimeout(() => handleBack(), 300);
      } else {
        setRegisterStatus("idle");
        toast.error(result.error || "Failed to register for event");
      }
    } catch (err: any) {
      console.error(err);
      setRegisterStatus("idle");
      toast.error("Something went wrong while registering");
    }
  };

  const renderQuestion = (question: FormQuestion) => {
    const questionKey = question.qorder.toString();
    const options = question.optionsCategory
      ? JSON.parse(question.optionsCategory)
      : null;

    switch (question.questionType) {
      case "text_answer":
        return (
          <div key={questionKey} className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              {question.questionTitle}
              {question.required && (
                <span className="text-rose-600 ml-1">*</span>
              )}
            </label>
            <textarea
              value={formAnswers[questionKey] || ""}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              placeholder="Enter your answer..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none transition-all"
              rows={3}
            />
          </div>
        );

      case "multiple_choice":
        return (
          <div key={questionKey} className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              {question.questionTitle}
              {question.required && (
                <span className="text-rose-600 ml-1">*</span>
              )}
            </label>
            <div className="space-y-2">
              {options?.choices?.map((choice: string, index: number) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-2 ${
                    formAnswers[questionKey] === index
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleInputChange(questionKey, index)}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      formAnswers[questionKey] === index
                        ? "border-amber-500 bg-amber-500"
                        : "border-gray-400"
                    }`}
                  >
                    {formAnswers[questionKey] === index && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-800 font-medium">{choice}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "multi_select":
        const selectedOptions = formAnswers[questionKey] || [];
        return (
          <div key={questionKey} className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              {question.questionTitle}
              {question.required && (
                <span className="text-rose-600 ml-1">*</span>
              )}
            </label>
            {options?.min || options?.max ? (
              <div className="text-sm text-gray-600 mb-3 font-medium">
                {options.min === options.max
                  ? `Select exactly ${options.min}`
                  : options.min && options.max
                    ? `Select between ${options.min} and ${options.max}`
                    : options.min
                      ? `Select at least ${options.min}`
                      : `Select up to ${options.max}`}
              </div>
            ) : null}
            <div className="space-y-2">
              {options?.choices?.map((choice: string, index: number) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedOptions.includes(index)
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleMultiSelectChange(questionKey, index)}
                >
                  <div
                    className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                      selectedOptions.includes(index)
                        ? "border-amber-500 bg-amber-500"
                        : "border-gray-400"
                    }`}
                  >
                    {selectedOptions.includes(index) && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-gray-800 font-medium">{choice}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 to-amber-50">
        <div className="text-center">
          <ThreeDot color="#78350f" size="medium" text="" textColor="" />
          <p className="mt-4 text-lg text-gray-600 font-medium">
            Loading event details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 to-amber-50">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 border-t-4 border-rose-900">
          <div className="text-lg text-rose-700 mb-6 font-semibold">
            {error || "Event not found"}
          </div>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-rose-900 text-amber-300 font-semibold rounded-lg hover:bg-rose-800 transition-colors shadow-md"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-amber-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-8 flex items-center gap-2 text-rose-900 hover:text-rose-700 transition-colors font-semibold group"
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

        {/* Event Header */}
        <div className="bg-white rounded-2xl shadow-xl border-t-4 border-amber-400 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-rose-900 mb-4">
                {event.title}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(
                    event.status,
                  )}`}
                >
                  {event.status.toUpperCase()}
                </span>
                {event.isPublic ? (
                  <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                    PUBLIC EVENT
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                    PRIVATE EVENT
                  </span>
                )}
              </div>
            </div>
          </div>

          {event.description && (
            <div className="border-t border-gray-200 pt-6">
              <p className="text-gray-700 text-lg leading-relaxed">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Date & Time */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-400 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-rose-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-rose-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-rose-900">Date & Time</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-rose-50 p-4 rounded-lg">
                <div className="text-xs font-semibold text-rose-700 mb-1 uppercase tracking-wide">
                  Start
                </div>
                <div className="text-gray-900 font-semibold text-lg">
                  {formatDate(event.startTime)}
                </div>
                <div className="text-gray-600 font-medium mt-1">
                  {formatTime(event.startTime)}
                </div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="text-xs font-semibold text-amber-800 mb-1 uppercase tracking-wide">
                  End
                </div>
                <div className="text-gray-900 font-semibold text-lg">
                  {formatDate(event.endTime)}
                </div>
                <div className="text-gray-600 font-medium mt-1">
                  {formatTime(event.endTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-400 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-rose-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-rose-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-rose-900">Location</h2>
            </div>
            <p className="text-gray-800 text-lg font-medium leading-relaxed">
              {event.location || "No location specified"}
            </p>
          </div>

          {/* Capacity */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-400 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-rose-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-rose-900"
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
              </div>
              <h2 className="text-xl font-bold text-rose-900">Capacity</h2>
            </div>
            <p className="text-gray-800 text-lg font-medium">
              {event.capacity > 0
                ? `${event.capacity} attendees`
                : "Unlimited capacity"}
            </p>
          </div>

          {/* Cost */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-400 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-rose-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-rose-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-rose-900">Cost</h2>
            </div>
            <p className="text-gray-800 text-lg font-medium">
              {event.cost > 0 ? (
                <span className="text-2xl font-bold text-rose-900">
                  ${event.cost.toFixed(2)}
                </span>
              ) : (
                <span className="text-2xl font-bold text-green-600">Free</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-xl p-6 border-t-4 border-rose-900">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              className="flex-1 px-8 py-4 bg-rose-900 text-amber-300 font-bold rounded-lg hover:bg-rose-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              onClick={openRegistrationForm}
              disabled={formLoading || registerStatus === "loading"}
            >
              {formLoading ? (
                <div className="flex items-center justify-center">
                  <ThreeDot color="#fcd34d" size="small" text="" textColor="" />
                </div>
              ) : registerStatus === "registered" ? (
                "Successfully Registered"
              ) : (
                "Register for Event"
              )}
            </button>
            <button className="px-8 py-4 border-2 border-rose-900 text-rose-900 font-bold rounded-lg hover:bg-rose-50 transition-all shadow-md hover:shadow-lg">
              Share Event
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <span className="font-medium">Created:</span>{" "}
          {formatDate(event.createdAt)}
          <span className="mx-3">•</span>
          <span className="font-medium">Last Updated:</span>{" "}
          {formatDate(event.updatedAt)}
        </div>
      </div>

      {/* Registration Form Modal */}
      {showRegistrationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-rose-900 text-amber-300 p-6 z-10 border-b-4 border-amber-400">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Event Registration</h3>
                <button
                  onClick={closeRegistrationForm}
                  className="text-amber-300 hover:text-amber-100 transition-colors"
                  disabled={registerStatus === "loading"}
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
              <p className="text-amber-200 text-sm mt-2">
                Please complete the form below to register for this event
              </p>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              {formQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                    No additional information required
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Click submit to complete your registration
                  </p>
                </div>
              ) : (
                <div>
                  {formQuestions.map((question) => renderQuestion(question))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 flex justify-end gap-4">
              <button
                onClick={closeRegistrationForm}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                disabled={registerStatus === "loading"}
              >
                Cancel
              </button>
              <button
                onClick={submitRegistration}
                disabled={registerStatus === "loading"}
                className="px-8 py-3 bg-rose-900 text-amber-300 font-bold rounded-lg hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-all"
              >
                {registerStatus === "loading" ? (
                  <>
                    <ThreeDot
                      color="#fcd34d"
                      size="small"
                      text=""
                      textColor=""
                    />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Registration"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
