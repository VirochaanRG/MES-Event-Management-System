import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Megaphone } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  body: string;
  eventId: number | null;
  eventTitle: string | null;
  createdAt: string;
  read: boolean;
}

interface Props {
  userEmail: string | undefined;
}

export default function AnnouncementsPopup({ userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const unreadCount = announcements.filter((a) => !a.read).length;

  const fetchAnnouncements = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/user/announcements?email=${encodeURIComponent(userEmail)}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (data.success) setAnnouncements(data.data);
    } catch {
      // silently fail — this is a background feature
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Poll for new announcements every 60 seconds
  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60_000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  // Mark unread announcements as read when popup opens
  const markAllRead = useCallback(async () => {
    if (!userEmail) return;
    const unreadIds = announcements.filter((a) => !a.read).map((a) => a.id);
    if (unreadIds.length === 0) return;
    try {
      await fetch("/api/user/announcements/read", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, announcementIds: unreadIds }),
      });
      setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch {
      // silently fail
    }
  }, [userEmail, announcements]);

  const handleOpen = () => {
    setOpen(true);
    // Mark as read after a short delay so users can see the notification has new items
    setTimeout(markAllRead, 800);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  const handleSelectAnnouncement = (ann: Announcement) => {
    setSelected(ann);
  };

  // Close popup when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={popupRef}>
      {/* Trigger button — yellow/red when unread (matches active tab style) */}
      <button
        onClick={handleOpen}
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 ${
          unreadCount > 0
            ? "bg-yellow-300 text-red-950 font-extrabold shadow-md hover:bg-yellow-200"
            : "border border-yellow-300/20 bg-white/10 hover:bg-white/15 text-yellow-300/60 hover:text-yellow-300/80 font-semibold"
        }`}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread announcement${unreadCount > 1 ? "s" : ""}`
            : "Announcements"
        }
      >
        <Bell className="w-4 h-4 shrink-0" />
        {unreadCount > 0 ? (
          <span className="text-xs whitespace-nowrap">
            {unreadCount} unread announcement{unreadCount > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-xs whitespace-nowrap">Announcements</span>
        )}
      </button>

      {/* Large popout list panel */}
      {open && (
        <div className="fixed right-4 top-20 w-[520px] max-w-[calc(100vw-2rem)] bg-red-950 border border-yellow-300/20 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden max-h-[75vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5 text-yellow-300">
              <Megaphone className="w-5 h-5" />
              <span className="font-bold text-base uppercase tracking-wider">
                Announcements
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 leading-none">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {loading && announcements.length === 0 ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/6 rounded w-full" />
                    <div className="h-3 bg-white/6 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="px-6 py-16 text-center text-white/40">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-base font-medium">No announcements yet</p>
                <p className="text-sm mt-1 opacity-70">
                  Check back later for updates.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {announcements.map((ann) => (
                  <button
                    key={ann.id}
                    onClick={() => handleSelectAnnouncement(ann)}
                    className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors hover:bg-white/8 active:bg-white/12 ${
                      !ann.read ? "bg-white/5" : ""
                    }`}
                  >
                    {/* Unread dot */}
                    <span
                      className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${
                        !ann.read ? "bg-red-400" : "bg-transparent"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm text-yellow-100 leading-snug">
                          {ann.title}
                        </p>
                        {ann.eventId && (
                          <span className="text-[11px] font-medium text-blue-300 bg-blue-900/40 border border-blue-700/40 rounded-full px-2 py-0.5 shrink-0">
                            {ann.eventTitle ?? `Event #${ann.eventId}`}
                          </span>
                        )}
                      </div>
                      <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
                        {ann.body}
                      </p>
                      <p className="text-[11px] text-white/25 mt-1.5">
                        {new Date(ann.createdAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Chevron hint */}
                    <span className="shrink-0 mt-1 text-white/20 text-xs">
                      ›
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-screen modal overlay when an announcement is selected */}
      {selected && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          {/* Dim backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal card */}
          <div
            className="relative z-10 w-full max-w-lg bg-red-950 border border-yellow-300/25 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/10">
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-lg text-yellow-300 leading-snug">
                  {selected.title}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {selected.eventId ? (
                    <span className="text-xs font-medium text-blue-300 bg-blue-900/40 border border-blue-700/40 rounded-full px-2.5 py-0.5">
                      {selected.eventTitle ?? `Event #${selected.eventId}`}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-green-300 bg-green-900/30 border border-green-700/30 rounded-full px-2.5 py-0.5">
                      General
                    </span>
                  )}
                  <span className="text-xs text-white/30">
                    {new Date(selected.createdAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              <p className="text-white/85 text-base leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </p>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="bg-yellow-300 hover:bg-yellow-200 text-red-950 font-bold text-sm px-5 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
