import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Form } from "@/interfaces/interfaces";

interface ModularForm {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  isPublic: boolean;
  isModular?: boolean;
}

export default function CompletedSurveys() {
  const navigate = useNavigate();
  const userId = JSON.parse(
    sessionStorage.getItem("teamd-auth-user") ?? '{"email" : ""}',
  ).email;

  const {
    data: formData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["completedSurveys", userId],
    queryFn: async () => {
      const [regularRes, modularRes] = await Promise.all([
        fetch(`/api/forms/completed/${userId}`),
        fetch(`/api/mod-forms/completed/${userId}`),
      ]);

      if (!regularRes.ok || !modularRes.ok) {
        throw new Error("Failed to fetch surveys");
      }

      const regularJson = await regularRes.json();
      const modularJson = await modularRes.json();

      const regularForms = (regularJson.data || []) as Form[];
      const modularForms = ((modularJson.data || []) as ModularForm[]).map(
        (f) => ({
          ...f,
          isModular: true,
        }),
      );

      return [...regularForms, ...modularForms];
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

  const handleSurveyClick = (item: Form | ModularForm) => {
    if ("isModular" in item && item.isModular) {
      navigate({ to: `/surveys/modular-form/${item.id}` });
    } else {
      navigate({ to: `/surveys/${item.id}` });
    }
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
      <p className="text-center text-gray-600 py-8">No completed surveys</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {formData.map((item) => (
        <div
          key={item.id}
          onClick={() => handleSurveyClick(item)}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 cursor-pointer hover:border-yellow-500"
        >
          {/* Event Image */}
          <div className="w-full h-48 bg-gradient-to-br from-red-900 to-yellow-500 flex items-center justify-center">
            <span className="text-4xl">
              {"isModular" in item && item.isModular ? "📋" : "📝"}
            </span>
          </div>

          {/* Event Content */}
          <div className="p-6">
            {/* Event Title */}
            <h3 className="text-xl font-bold text-red-900 mb-2">{item.name}</h3>

            {/* Event Description */}
            <p className="text-gray-600 text-sm mb-4">
              {item.description || "No description available"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
