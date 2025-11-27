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
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const registerButton = async () => {
    if (!user?.email) {
      toast.error("You must be logged in to register for this event");
      return;
    }
    setRegisterStatus("loading");
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: user?.email }),
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
            setTimeout(() => handleBack(), 300);
          } else {
            toast.error("QR generation failed");
          }
        } else if (
          result.error === "User is already registered for this event"
        ) {
          toast.error("You are already registered for this event");
          setRegisterStatus("idle");
          setTimeout(() => handleBack(), 300);
        } else {
          setRegisterStatus("idle");
          toast.error("Failed to register for event");
        }
      }
    } catch (err: any) {
      console.error(err);
      setRegisterStatus("idle");
      toast.error("Something went wrong while registering");
    }
  };

  let buttonTitle;
  if (registerStatus === "loading") {
    buttonTitle = (
      <ThreeDot color="#808980ff" size="medium" text="" textColor="" />
    );
  } else if (registerStatus === "registered") {
    buttonTitle = "Registered";
  } else {
    buttonTitle = "Register for Event";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">
            {error || "Event not found"}
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
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

        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {event.title}
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    event.status
                  )}`}
                >
                  {event.status.toUpperCase()}
                </span>
                {event.isPublic ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    PUBLIC
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    PRIVATE
                  </span>
                )}
              </div>
            </div>
          </div>

          {event.description && (
            <p className="text-gray-700 text-lg leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Date & Time */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
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
              <h2 className="text-xl font-semibold text-gray-900">
                Date & Time
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">Start</div>
                <div className="text-gray-900 font-medium">
                  {formatDate(event.startTime)}
                </div>
                <div className="text-gray-700">
                  {formatTime(event.startTime)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">End</div>
                <div className="text-gray-900 font-medium">
                  {formatDate(event.endTime)}
                </div>
                <div className="text-gray-700">{formatTime(event.endTime)}</div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
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
              <h2 className="text-xl font-semibold text-gray-900">Location</h2>
            </div>
            <p className="text-gray-700 text-lg">
              {event.location || "No location specified"}
            </p>
          </div>

          {/* Capacity */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
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
              <h2 className="text-xl font-semibold text-gray-900">Capacity</h2>
            </div>
            <p className="text-gray-700 text-lg">
              {event.capacity > 0
                ? `${event.capacity} attendees`
                : "Unlimited capacity"}
            </p>
          </div>

          {/* Cost */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
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
              <h2 className="text-xl font-semibold text-gray-900">Cost</h2>
            </div>
            <p className="text-gray-700 text-lg">
              {event.cost > 0 ? `$${event.cost.toFixed(2)}` : "Free"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-300 p-6">
          <div className="flex gap-4">
            <button
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              onClick={registerButton}
            >
              {buttonTitle}
            </button>
            <button className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Share Event
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Created {formatDate(event.createdAt)} • Last updated{" "}
          {formatDate(event.updatedAt)}
        </div>
      </div>
    </div>
  );
}
