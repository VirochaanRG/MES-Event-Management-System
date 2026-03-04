import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

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
  createdAt: string;
  updatedAt: string;
}

export default function AvailableEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventImages, setEventImages] = useState<Map<number, string>>(
    new Map(),
  );

  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["availableEvents", user?.email],
    queryFn: async () => {
      const url = user?.email
        ? `/api/events/available?userEmail=${encodeURIComponent(user.email)}`
        : "/api/events/available";

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch events");
      const json = await response.json();
      return json.data;
    },
  });

  const fetchEventImage = async (eventId: number) => {
    try {
      // Adding a timestamp (?t=...) forces the browser to bypass the cache
      const response = await fetch(
        `/api/images/event/${eventId}?t=${Date.now()}`,
      );

      if (response.ok) {
        const blob = await response.blob();
        const newImageUrl = URL.createObjectURL(blob);

        setEventImages((prev) => {
          // CLEANUP: Revoke the old URL to prevent memory leaks
          const oldUrl = prev.get(eventId);
          if (oldUrl) URL.revokeObjectURL(oldUrl);

          return new Map(prev).set(eventId, newImageUrl);
        });
      }
    } catch (error) {
      console.error(`Failed to fetch image for event ${eventId}:`, error);
    }
  };

  useEffect(() => {
    if (eventsData) {
      eventsData.forEach((event: Event) => {
        fetchEventImage(event.id);
      });
    }

    // Cleanup blob URLs on unmount
    return () => {
      eventImages.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [eventsData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleEventClick = (eventId: number) => {
    navigate({ to: `/events/${eventId}` });
  };

  if (isLoading) {
    return <p className="text-center text-gray-600 py-8">Loading events...</p>;
  }

  if (error) {
    return (
      <p className="text-center text-red-600 py-8">Error loading events</p>
    );
  }

  if (!eventsData || eventsData.length === 0) {
    return (
      <p className="text-center text-gray-600 py-8">No events available</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(eventsData as Event[]).map((event) => (
        <div
          key={event.id}
          onClick={() => handleEventClick(event.id)}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 cursor-pointer hover:border-yellow-500"
        >
          {/* Event Image */}
          {eventImages.has(event.id) ? (
            <div className="w-full h-48 overflow-hidden">
              <img
                src={eventImages.get(event.id)}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-red-900 to-yellow-500 flex items-center justify-center">
              <span className="text-4xl">📅</span>
            </div>
          )}

          {/* Event Content */}
          <div className="p-6">
            {/* Event Title */}
            <h3 className="text-xl font-bold text-red-900 mb-2">
              {event.title}
            </h3>

            {/* Event Description */}
            <p className="text-gray-600 text-sm mb-4">
              {event.description || "No description available"}
            </p>

            {/* Event Location */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-red-900 font-semibold">📍</span>
              <span className="text-gray-700">{event.location || "TBA"}</span>
            </div>

            {/* Event Date Range */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-red-900 font-semibold">🗓️</span>
              <span className="text-gray-700 text-sm">
                {formatDate(event.startTime)} - {formatDate(event.endTime)}
              </span>
            </div>

            {/* Status Badge */}
            <div className="flex justify-between items-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                  event.status === "scheduled" ? "bg-yellow-500" : "bg-red-900"
                }`}
              >
                {event.status}
              </span>
              <span className="text-xs text-gray-500">
                {event.capacity} capacity
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
