import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
        <span className="text-5xl select-none">🎉</span>
      </div>
    );
  }
  if (!src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-red-950 via-red-900 to-stone-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin" />
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

function groupByMonth(events: Event[]): { label: string; events: Event[] }[] {
  const map = new Map<string, Event[]>();
  events.forEach((event) => {
    const key = new Date(event.startTime).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  });
  return Array.from(map.entries()).map(([label, events]) => ({
    label,
    events,
  }));
}

export default function AvailableEvents({ onCountChange }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: eventsData,
    isLoading: loadingEvents,
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
      return json.data as Event[];
    },
  });

  const { data: registeredIds, isLoading: loadingRegistered } = useQuery({
    queryKey: ["registeredEventIds", user?.email],
    enabled: !!user?.email && !!eventsData,
    queryFn: async () => {
      if (!eventsData || !user?.email) return new Set<number>();
      const checks = await Promise.all(
        eventsData.map(async (e) => {
          const res = await fetch(
            `/api/events/${e.id}/registration?userEmail=${encodeURIComponent(user.email)}`,
          );
          const json = await res.json();
          return json.isRegistered ? e.id : null;
        }),
      );
      return new Set<number>(checks.filter((id): id is number => id !== null));
    },
  });

  // Filter pipeline: remove registered events
  const filtered = useMemo(() => {
    if (!eventsData) return [];
    return eventsData.filter((e) => !registeredIds?.has(e.id));
  }, [eventsData, registeredIds]);

  // Report count to parent
  useEffect(() => {
    if (!loadingEvents && !loadingRegistered) {
      onCountChange?.(filtered.length);
    }
  }, [filtered.length, loadingEvents, loadingRegistered]);

  const isLoading = loadingEvents || loadingRegistered;

  const formatDay = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  if (isLoading) {
    return (
      <div className="space-y-10">
        {[1, 2].map((g) => (
          <div key={g}>
            <div className="h-4 w-28 bg-stone-200 rounded mb-5 animate-pulse" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex bg-white rounded-2xl overflow-hidden border-2 border-stone-100 h-52 animate-pulse"
                >
                  <div className="w-64 shrink-0 bg-stone-200" />
                  <div className="flex-1 p-7 space-y-3">
                    <div className="h-5 bg-stone-200 rounded w-1/2" />
                    <div className="h-3 bg-stone-100 rounded w-full" />
                    <div className="h-3 bg-stone-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
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

  const groups = groupByMonth(filtered);

  return (
    <div className="space-y-8">
      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-2xl border-2 border-stone-100">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-stone-700 font-bold text-base mb-1">
            All caught up!
          </p>
          <p className="text-stone-400 text-sm">
            No new events to register for — check back soon.
          </p>
        </div>
      ) : (
        groups.map(({ label, events }) => (
          <div key={label}>
            {/* Month heading */}
            <div className="flex items-center gap-4 mb-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-red-800 shrink-0">
                {label}
              </h3>
              <div className="flex-1 h-px bg-red-900/10" />
              <span className="text-xs text-stone-400 font-medium shrink-0">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => navigate({ to: `/events/${event.id}` })}
                  className="group flex bg-white rounded-2xl overflow-hidden border-2 border-stone-100 hover:border-red-900/20 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-52"
                >
                  {/* Image */}
                  <div className="relative w-64 shrink-0 overflow-hidden">
                    <EventImage eventId={event.id} title={event.title} />
                    <span
                      className={`absolute top-3 left-3 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow ${
                        event.status === "scheduled"
                          ? "bg-yellow-300 text-red-900"
                          : "bg-stone-800 text-white"
                      }`}
                    >
                      {event.status}
                    </span>
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

                  {/* CTA */}
                  <div className="flex items-center pr-7 shrink-0">
                    <span className="bg-red-900 group-hover:bg-red-800 text-yellow-300 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors shadow-sm whitespace-nowrap">
                      View →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
