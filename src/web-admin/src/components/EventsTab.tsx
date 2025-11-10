import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

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

  return (
    <div>
      <h4 className="text-2xl font-bold text-purple-700 mb-3">Events</h4>
      {eventsLoading && <p className="text-gray-600">Loading events...</p>}
      {eventsError && <p className="text-red-600">Error loading events</p>}
      {eventsData && eventsData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(eventsData as Event[]).map((event) => (
            <div
              key={event.id}
              onClick={() => navigate({ to: `/events/${event.id}` })}
              className="p-4 bg-white rounded-lg border border-gray-300 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              <h5 className="text-lg font-bold text-purple-700 mb-2">
                {event.title}
              </h5>
              <p className="text-sm text-gray-600 mb-2">
                {event.description || "No description"}
              </p>
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <strong>Location:</strong> {event.location || "N/A"}
                </p>
                <p>
                  <strong>Start:</strong>{" "}
                  {new Date(event.startTime).toLocaleString()}
                </p>
                <p>
                  <strong>End:</strong>{" "}
                  {new Date(event.endTime).toLocaleString()}
                </p>
                <p>
                  <strong>Capacity:</strong> {event.capacity}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span
                    className={`px-2 py-1 rounded text-white text-xs font-semibold ${
                      event.status === "scheduled"
                        ? "bg-blue-500"
                        : "bg-green-500"
                    }`}
                  >
                    {event.status}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      event.isPublic ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {event.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowModal(true)}
            className="p-4 bg-white rounded-lg border-2 border-dashed border-purple-300 shadow-md hover:shadow-lg transition-shadow flex items-center justify-center cursor-pointer hover:border-purple-500"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-700 mb-2">+</div>
              <p className="text-lg font-semibold text-purple-700">
                Add New Event
              </p>
            </div>
          </button>
        </div>
      ) : (
        <p className="text-gray-600">No events found</p>
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
    >
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
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-purple-700">
            Create New Event
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="Event location"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Capacity
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              className="w-4 h-4 text-purple-700 rounded focus:ring-2 focus:ring-purple-500"
            />
            <label
              htmlFor="isPublic"
              className="ml-2 text-sm font-semibold text-gray-700"
            >
              Make event public
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
