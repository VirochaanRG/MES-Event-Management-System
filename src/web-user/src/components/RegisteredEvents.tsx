import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

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

interface QrCodeEntry {
  id: number;
  eventId: number;
  userEmail: string;
  instance: number | null;
  imageBase64?: string;
}

export default function RegisteredEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(false);
  const [eventImages, setEventImages] = useState<Map<number, string>>(
    new Map(),
  );
  const [qrModal, setQrModal] = useState<{
    eventTitle: string;
    src: string;
  } | null>(null);

  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["availableEvents"],
    queryFn: async () => {
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      const json = await response.json();
      return json.data;
    },
  });

  const fetchEventImage = async (eventId: number) => {
    try {
      const response = await fetch(`/api/images/event/${eventId}`);
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setEventImages((prev) => new Map(prev).set(eventId, imageUrl));
      }
    } catch (error) {
      // Image doesn't exist, keep placeholder
      console.log(`No image for event ${eventId}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleEventClick = async (eventId: number, eventTitle: string) => {
    try {
      const email = user?.email;
      const res = await fetch(
        `/api/events/${eventId}/event-qrcodes?userEmail=${email}`,
      );
      const json = await res.json();

      if (!json.success) {
        toast.error("No QR code found for this registration");
        return;
      }

      const qr: QrCodeEntry = json.data[0];
      setQrModal({
        eventTitle,
        src: `data:image/png;base64,${qr.imageBase64}`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load QR code");
    }
  };

  useEffect(() => {
    const fetchRegisteredEvents = async () => {
      setLoadingRegistered(true);
      try {
        const email = user?.email;

        const results: Event[] = [];
        for (const e of eventsData) {
          const res = await fetch(
            `/api/events/${e.id}/registration?userEmail=${email}`,
          );
          const json = await res.json();
          if (json.success && json.isRegistered) {
            results.push(e);
            // Fetch image for registered events
            fetchEventImage(e.id);
          }
        }
        setRegisteredEvents(results);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load registered events");
      } finally {
        setLoadingRegistered(false);
      }
    };
    fetchRegisteredEvents();

    // Cleanup blob URLs on unmount
    return () => {
      eventImages.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [user?.email, eventsData]);

  if (isLoading || loadingRegistered) {
    return <p className="text-center text-gray-600 py-8">Loading events...</p>;
  }

  if (error) {
    return (
      <p className="text-center text-red-600 py-8">Error loading events</p>
    );
  }

  if (!registeredEvents || registeredEvents.length === 0) {
    return (
      <p className="text-center text-gray-600 py-8">
        Not registered to any events
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {registeredEvents.map((event) => (
          <div
            key={event.id}
            onClick={() => handleEventClick(event.id, event.title)}
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
                    event.status === "scheduled"
                      ? "bg-yellow-500"
                      : "bg-red-900"
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

      {qrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold text-red-900 mb-4">
              Ticket for {qrModal.eventTitle}
            </h3>
            <div className="flex justify-center mb-4">
              <img
                src={qrModal.src}
                alt="Event QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
            <button
              onClick={() => setQrModal(null)}
              className="mt-2 px-4 py-2 bg-red-900 text-white rounded-md hover:bg-red-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
