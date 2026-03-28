import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/AdminLayout";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Megaphone, Trash2, PlusCircle } from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  body: string;
  eventId: number | null;
  eventTitle: string | null;
  createdAt: string;
}

interface EventOption {
  id: number;
  title: string;
}

export const Route = createFileRoute("/announcements/")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  useEffect(() => {
    const sessionUser = getCurrentUser("admin");
    if (!sessionUser || !sessionUser.roles?.includes("admin")) {
      logout("admin");
      navigate({ to: "/" });
      return;
    }
    setUser(sessionUser);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [annRes, evRes] = await Promise.all([
        fetch("/api/announcements", { credentials: "include" }),
        fetch("/api/events", { credentials: "include" }),
      ]);
      const annData = await annRes.json();
      const evData = await evRes.json();
      if (annData.success) setAnnouncements(annData.data);
      if (evData.success)
        setEvents(evData.data.map((e: any) => ({ id: e.id, title: e.title })));
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          eventId: selectedEventId ? parseInt(selectedEventId) : null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to create announcement");
        return;
      }
      setTitle("");
      setBody("");
      setSelectedEventId("");
      setShowForm(false);
      await loadData();
    } catch {
      setError("Failed to create announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this announcement? Users will no longer see it."))
      return;
    try {
      await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Failed to delete announcement");
    }
  };

  if (!user) return null;

  return (
    <AdminLayout user={user} title="Announcements">
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 text-sm">
            Create general or event-specific announcements. Event announcements
            are only shown to registered attendees.
          </p>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-yellow-300 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            New Announcement
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              New Announcement
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                maxLength={255}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What do you want to announce?"
                rows={4}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-900 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Audience
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-900 bg-white"
              >
                <option value="">General (all users)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} (registered attendees only)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                General announcements appear to all logged-in users. Event
                announcements only appear to users registered for that event.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-red-900 hover:bg-red-800 disabled:opacity-50 text-yellow-300 font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
              >
                {submitting ? "Publishing…" : "Publish Announcement"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setTitle("");
                  setBody("");
                  setSelectedEventId("");
                  setError(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Announcements list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No announcements yet</p>
            <p className="text-sm mt-1">
              Click "New Announcement" to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {ann.title}
                    </h3>
                    {ann.eventId ? (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {ann.eventTitle ?? `Event #${ann.eventId}`}
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                        General
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {ann.body}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(ann.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
