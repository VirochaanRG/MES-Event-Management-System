import { useQuery } from "@tanstack/react-query";

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
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await fetch("http://localhost:3124/api/events");
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Title
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Location
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Start Time
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Status
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Capacity
                </th>
              </tr>
            </thead>
            <tbody>
              {(eventsData as Event[]).map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">
                    {event.title}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {event.location || "N/A"}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {new Date(event.startTime).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-white ${
                        event.status === "scheduled"
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {event.capacity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600">No events found</p>
      )}
    </div>
  );
}
