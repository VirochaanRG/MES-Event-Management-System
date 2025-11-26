import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();

  const {
    data: { event, registeredList },
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/registrationlist`);
      if (!response.ok) throw new Error("Failed to fetch event");
      const json = await response.json();
      return json.data;
    },
  });

  if (isLoading) return <p>Loading event...</p>;
  if (error) return <p>Error loading event</p>;
  if (!event) return <p>Event not found</p>;

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold text-purple-700 mb-2">
        Registered Users
      </h2>
      {isLoading ? (
        <p>Loading registrations...</p>
      ) : error ? (
        <p>Error loading registrations</p>
      ) : registeredList && registeredList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Instance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Registered At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payment Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registeredList.map((reg: any) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.userEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.instance ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(reg.registeredAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{reg.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.paymentStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No users registered</p>
      )}
    </div>
  );
}
