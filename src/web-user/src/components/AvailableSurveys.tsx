import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Form } from "@/interfaces/interfaces";

export default function AvailableSurveys() {
  const navigate = useNavigate();
  const userId = JSON.parse(
    sessionStorage.getItem("teamd-auth-user") ?? '{"email" : ""}',
  ).email;

  const {
    data: formData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["availableSurveys", userId],
    queryFn: async () => {
      const response = await fetch(`/api/forms/available/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch surveys");
      const json = await response.json();
      return json.data;
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSurveyClick = (formId: number) => {
    navigate({ to: `/surveys/${formId}` });
  };

  if (isLoading) {
    return <p className="text-center text-gray-600 py-8">Loading surveys...</p>;
  }

  if (error) {
    return (
      <p className="text-center text-red-600 py-8">Error loading surveys</p>
    );
  }

  if (!formData || formData.length === 0) {
    return (
      <p className="text-center text-gray-600 py-8">No surveys available</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(formData as Form[]).map((form) => (
        <div
          key={form.id}
          onClick={() => handleSurveyClick(form.id)}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 cursor-pointer hover:border-yellow-500"
        >
          {/* Event Image */}
          <div className="w-full h-48 bg-gradient-to-br from-red-900 to-yellow-500 flex items-center justify-center">
            <span className="text-4xl">📝</span>
          </div>

          {/* Event Content */}
          <div className="p-6">
            {/* Event Title */}
            <h3 className="text-xl font-bold text-red-900 mb-2">{form.name}</h3>

            {/* Event Description */}
            <p className="text-gray-600 text-sm mb-4">
              {form.description || "No description available"}
            </p>

            {/* Event Date Range */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-red-900 font-semibold">🗓️</span>
              <span className="text-gray-700 text-sm">
                Created: {formatDate(form.createdAt)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
