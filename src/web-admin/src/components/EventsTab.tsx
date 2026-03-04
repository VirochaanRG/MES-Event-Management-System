import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Event } from "@/interfaces/interfaces";

export default function EventsTab() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch,
  } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await fetch("/api/events");
      if (!response.ok) throw new Error("Failed to fetch events");
      const json = await response.json();
      return json.data;
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { month, day, time };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b-2 border-red-900 pb-3">
        <h2 className="text-2xl font-bold text-stone-900">Events</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2 bg-red-900 text-white hover:bg-red-950 font-medium"
        >
          Create Event
        </button>
      </div>

      {eventsLoading && <p className="text-stone-600">Loading events...</p>}
      {eventsError && (
        <p className="text-red-900 font-medium">Error loading events</p>
      )}

      {eventsData && eventsData.length > 0 ? (
        <div className="space-y-3">
          {(eventsData.slice(0, 3) as Event[]).map((event) => {
            const startDate = formatDate(event.startTime);
            const endDate = formatDate(event.endTime);
            return (
              <div
                key={event.id}
                onClick={() => navigate({ to: `/events/${event.id}` })}
                className="bg-white border border-stone-300 hover:border-red-900 transition-colors cursor-pointer"
              >
                <div className="flex">
                  <div className="w-20 bg-stone-100 flex flex-col items-center justify-center border-r border-stone-300">
                    <div className="text-xs font-bold text-stone-600 uppercase">
                      {startDate.month}
                    </div>
                    <div className="text-2xl font-bold text-stone-900">
                      {startDate.day}
                    </div>
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-stone-900">
                        {event.title}
                      </h3>
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-semibold ${
                            event.status === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : event.status === "ongoing"
                                ? "bg-green-100 text-green-800"
                                : event.status === "completed"
                                  ? "bg-stone-100 text-stone-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {event.status}
                        </span>
                        <span
                          className={`px-3 py-1 text-xs font-semibold ${
                            event.isPublic
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {event.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-sm text-stone-600 mb-3">
                        {event.description}
                      </p>
                    )}

                    <div className="flex gap-6 text-sm text-stone-700">
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">Location:</span>
                          <span>{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Time:</span>
                        <span>
                          {startDate.time} - {endDate.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !eventsLoading && (
          <div className="bg-white border border-stone-300 p-12 text-center">
            <p className="text-stone-600 mb-4">No events found</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2 bg-red-900 text-white hover:bg-red-950 font-medium"
            >
              Create Your First Event
            </button>
          </div>
        )
      )}

      {showModal && (
        <CreateEventModal
          onClose={() => setShowModal(false)}
          onEventCreated={() => refetch()}
        />
      )}
    </div>
  );
}

function CreateEventModal({
  onClose,
  onEventCreated,
}: {
  onClose: () => void;
  onEventCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
    capacity: 0,
    isPublic: true,
    status: "scheduled",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/event/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          startTime: formData.startTime,
          endTime: formData.endTime,
          capacity: parseInt(formData.capacity.toString()),
          isPublic: formData.isPublic,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      const data = await response.json();
      console.log("Event created successfully:", data);
      onEventCreated();
      onClose();
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md max-h-screen overflow-y-auto">
        <div className="bg-stone-100 border-b-2 border-red-900 p-5 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-stone-900">Create Event</h3>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-900 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:border-red-900"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-900 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:border-red-900"
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-900 mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:border-red-900"
              placeholder="Event location"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-stone-900 mb-2">
                Start Time *
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:border-red-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-900 mb-2">
                End Time *
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:border-red-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-900 mb-2">
              Capacity
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:border-red-900"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-900 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 focus:outline-none focus:border-red-900"
            >
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label
              htmlFor="isPublic"
              className="text-sm font-bold text-stone-900"
            >
              Make event public
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-stone-300 text-stone-900 font-semibold hover:bg-stone-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-900 text-white font-semibold hover:bg-red-950"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
