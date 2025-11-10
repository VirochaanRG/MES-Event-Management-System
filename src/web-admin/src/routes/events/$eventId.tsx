import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error("Failed to fetch event");
      const json = await response.json();
      return json.data;
    },
  });

  if (isLoading) return <p>Loading event...</p>;
  if (error) return <p>Error loading event</p>;
  if (!event) return <p>Event not found</p>;

  return (
    <div className="p-6 bg-white rounded-lg">
      <h1 className="text-3xl font-bold text-purple-700 mb-4">{event.title}</h1>
      <p className="text-gray-600 mb-4">{event.description}</p>
      <div className="space-y-2">
        <p>
          <strong>Location:</strong> {event.location || "N/A"}
        </p>
        <p>
          <strong>Start:</strong> {new Date(event.startTime).toLocaleString()}
        </p>
        <p>
          <strong>End:</strong> {new Date(event.endTime).toLocaleString()}
        </p>
        <p>
          <strong>Capacity:</strong> {event.capacity}
        </p>
        <p>
          <strong>Status:</strong> {event.status}
        </p>
        <p>
          <strong>Public:</strong> {event.isPublic ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
}
