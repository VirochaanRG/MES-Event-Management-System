import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EventPhotoGrid from "@/components/EventPhotoGrid";

interface Event {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  status: string;
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
      <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900 flex items-center justify-center">
        <span className="text-4xl select-none">📸</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function PastEvents() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const {
    data: allEvents,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pastEvents"],
    queryFn: async () => {
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      const json = await response.json();
      return json.data as Event[];
    },
  });

  const pastEvents = useMemo(() => {
    if (!allEvents) return [];

    const now = new Date();
    return allEvents
      .filter((event) => {
        const ended = new Date(event.endTime) < now;
        return ended || event.status.toLowerCase() === "completed";
      })
      .sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
      );
  }, [allEvents]);

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startText = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const endText = endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return startText === endText ? startText : `${startText} - ${endText}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex bg-white rounded-2xl overflow-hidden border-2 border-stone-100 h-48 animate-pulse"
          >
            <div className="w-56 shrink-0 bg-stone-200" />
            <div className="flex-1 p-6 space-y-3">
              <div className="h-6 bg-stone-200 rounded w-1/2" />
              <div className="h-3 bg-stone-100 rounded w-2/3" />
              <div className="h-3 bg-stone-100 rounded w-full" />
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
          Failed to load past events.
        </p>
      </div>
    );
  }

  if (!pastEvents.length) {
    return (
      <div className="text-center py-20 bg-stone-50 rounded-2xl border-2 border-stone-100">
        <div className="text-5xl mb-4">🕰️</div>
        <p className="text-stone-800 font-bold text-base mb-1">
          No past events yet
        </p>
        <p className="text-stone-400 text-sm">
          Completed events and photos will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pastEvents.map((event) => (
          <button
            key={event.id}
            onClick={() => setSelectedEvent(event)}
            className="w-full text-left group flex bg-white rounded-2xl overflow-hidden border-2 border-stone-100 hover:border-red-900/20 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 h-48"
          >
            <div className="relative w-56 shrink-0 overflow-hidden">
              <EventImage eventId={event.id} title={event.title} />
              <span className="absolute top-3 left-3 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow">
                Past Event
              </span>
            </div>

            <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
              <div>
                <h4 className="text-2xl font-black text-stone-900 leading-tight group-hover:text-red-900 transition-colors">
                  {event.title}
                </h4>
                <p className="text-sm text-stone-500 mt-2">
                  {formatDateRange(event.startTime, event.endTime)}
                </p>
              </div>

              <p className="text-sm text-stone-600 line-clamp-3 mt-3">
                {event.description || "No description provided for this event."}
              </p>

              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-red-900">
                View Photo Gallery →
              </p>
            </div>
          </button>
        ))}
      </div>

      {selectedEvent && (
        <EventPhotoGrid
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
