import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useCustomConfirm } from "@/components/CustomAlert";

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

interface Props {
  onCountChange?: (count: number) => void;
}

function EventImage({ eventId, title }: { eventId: number; title: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    fetch(`/api/images/event/${eventId}?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error("no image");
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setFailed(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eventId]);

  if (failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-red-950 via-red-900 to-stone-900 flex items-center justify-center">
        <span className="text-4xl select-none">🎉</span>
      </div>
    );
  }
  if (!src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-red-950 via-red-900 to-stone-900 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

export default function RegisteredEvents({ onCountChange }: Props) {
  const { user } = useAuth();
  const showConfirm = useCustomConfirm();
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(false);
  const [qrModal, setQrModal] = useState<{
    eventId: number;
    eventTitle: string;
    src: string;
  } | null>(null);
  const [deregisteringEventId, setDeregisteringEventId] = useState<
    number | null
  >(null);

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

  const formatDay = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const handleViewTicket = async (eventId: number, eventTitle: string) => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/event-qrcodes?userEmail=${user?.email}`,
      );
      const json = await res.json();
      if (!json.success) {
        toast.error("No QR code found for this registration");
        return;
      }
      const qr: QrCodeEntry = json.data[0];
      setQrModal({
        eventId,
        eventTitle,
        src: `data:image/png;base64,${qr.imageBase64}`,
      });
    } catch {
      toast.error("Failed to load QR code");
    }
  };

  const handleDeregister = async (eventId: number, eventTitle: string) => {
    const confirmed = await showConfirm(
      `Are you sure you want to deregister from "${eventTitle}"?`,
    );
    if (!confirmed) return;

    setDeregisteringEventId(eventId);
    try {
      const res = await fetch(
        `/api/events/${eventId}/register?userEmail=${user?.email}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to deregister from event");
        return;
      }
      toast.success("Successfully deregistered from event");
      setRegisteredEvents((prev) => prev.filter((e) => e.id !== eventId));
      if (qrModal?.eventId === eventId) setQrModal(null);
    } catch {
      toast.error("Failed to deregister from event");
    } finally {
      setDeregisteringEventId(null);
    }
  };

  useEffect(() => {
    const fetchRegistered = async () => {
      if (!user?.email || !eventsData || !Array.isArray(eventsData)) return;
      setLoadingRegistered(true);
      try {
        const results: Event[] = [];
        for (const e of eventsData) {
          const res = await fetch(
            `/api/events/${e.id}/registration?userEmail=${user.email}`,
          );
          const json = await res.json();
          if (json.success && json.isRegistered) results.push(e);
        }
        setRegisteredEvents(results);
      } catch {
        toast.error("Failed to load registered events");
      } finally {
        setLoadingRegistered(false);
      }
    };
    fetchRegistered();
  }, [user?.email, eventsData]);

  // Report count to parent whenever it changes
  useEffect(() => {
    if (!isLoading && !loadingRegistered) {
      onCountChange?.(registeredEvents.length);
    }
  }, [registeredEvents.length, isLoading, loadingRegistered]);

  if (isLoading || loadingRegistered) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex bg-white rounded-2xl overflow-hidden border-2 border-stone-100 h-52 animate-pulse"
          >
            <div className="w-64 shrink-0 bg-stone-200" />
            <div className="flex-1 p-7 space-y-3">
              <div className="h-5 bg-stone-200 rounded w-1/2" />
              <div className="h-3 bg-stone-100 rounded w-full" />
              <div className="h-3 bg-stone-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-700 font-semibold text-sm">
          Failed to load events. Please try again.
        </p>
      </div>
    );
  }

  if (!registeredEvents || registeredEvents.length === 0) {
    return (
      <div className="text-center py-20 bg-stone-50 rounded-2xl border-2 border-stone-100">
        <div className="text-5xl mb-4">🎟️</div>
        <p className="text-stone-800 font-bold text-base mb-1">
          No registered events
        </p>
        <p className="text-stone-400 text-sm">
          Head to Available Events to find something exciting!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {registeredEvents.map((event) => (
          <div
            key={event.id}
            className="group flex bg-white rounded-2xl overflow-hidden border-2 border-stone-100 hover:border-green-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 h-52"
          >
            {/* Image — click opens ticket */}
            <div
              className="relative w-64 shrink-0 overflow-hidden cursor-pointer"
              onClick={() => handleViewTicket(event.id, event.title)}
            >
              <EventImage eventId={event.id} title={event.title} />
              <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow">
                ✓ Registered
              </span>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  🎟️ View Ticket
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 px-8 py-6 flex flex-col justify-between gap-3 min-w-0">
              <h4 className="text-2xl font-black text-stone-900 leading-tight group-hover:text-red-900 transition-colors">
                {event.title}
              </h4>

              <div className="space-y-2.5">
                {[
                  {
                    icon: "📅",
                    text: `${formatDay(event.startTime)} – ${formatDay(event.endTime)}`,
                  },
                  {
                    icon: "⏰",
                    text: `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`,
                  },
                  {
                    icon: "📍",
                    text: event.location || "TBA",
                  },
                ].map(({ icon, text }) => (
                  <div
                    key={icon}
                    className="flex items-center gap-2 text-sm text-stone-600"
                  >
                    <span className="w-7 h-7 bg-yellow-50 rounded-md flex items-center justify-center shrink-0">
                      {icon}
                    </span>
                    <span className="truncate">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-2.5 pr-7 shrink-0">
              <button
                onClick={() => handleViewTicket(event.id, event.title)}
                className="bg-red-900 hover:bg-red-800 text-yellow-300 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors shadow-sm whitespace-nowrap"
              >
                🎟️ Ticket
              </button>
              <button
                onClick={() => handleDeregister(event.id, event.title)}
                disabled={deregisteringEventId === event.id}
                className="bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-700 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors border border-stone-200 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {deregisteringEventId === event.id ? "Removing…" : "Deregister"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setQrModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="inline-block bg-green-100 text-green-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              ✓ You're In
            </span>
            <h3 className="text-xl font-black text-stone-900 mb-1">
              {qrModal.eventTitle}
            </h3>
            <p className="text-stone-400 text-xs mb-6">
              Show this QR code at the door
            </p>
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-stone-50 rounded-2xl border-2 border-stone-100">
                <img
                  src={qrModal.src}
                  alt="Event QR Code"
                  className="w-56 h-56 object-contain"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setQrModal(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setQrModal(null);
                  handleDeregister(qrModal.eventId, qrModal.eventTitle);
                }}
                disabled={deregisteringEventId === qrModal.eventId}
                className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm rounded-xl border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deregisteringEventId === qrModal.eventId
                  ? "Removing…"
                  : "Deregister"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
