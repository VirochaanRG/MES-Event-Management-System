import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser } from "../lib/auth";
import ProtectedTeamPortal from "../components/ProtectedTeamPortal";
import EventsTab from "@/components/EventsTab";
import Navbar from "@/components/Navbar";

function TeamBDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "users" | "reports">(
    "events"
  );
  const navigate = useNavigate();

  useEffect(() => {
    const authUser = getCurrentUser();
    setUser(authUser);
  }, []);

  const handleFormBuilder = () => {
    navigate({ to: "/form-builder" });
  };

  return (
    <>
    <Navbar/>
    <main className="m-0 p-0">
      <div className="text-center px-5 py-10 bg-gray-100 rounded-lg mx-5 my-5">
        <h2 className="text-3xl text-gray-700 mb-5">Admin Dashboard</h2>

        {/* Team D specific content */}
        <div className="mt-7 p-5 bg-gray-50 rounded-lg border border-gray-300">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6 border-b border-gray-300 justify-between items-end">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("events")}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === "events"
                    ? "text-purple-700 border-b-2 border-purple-700"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === "users"
                    ? "text-purple-700 border-b-2 border-purple-700"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === "reports"
                    ? "text-purple-700 border-b-2 border-purple-700"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Reports
              </button>
            </div>
            <button
              onClick={handleFormBuilder}
              className="px-6 py-2 font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded hover:from-purple-700 hover:to-purple-800 transition-all"
            >
              Form Builder
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-6 p-6 bg-white rounded-lg border border-gray-200">
            {activeTab === "events" && (
              <div>
                <EventsTab />
              </div>
            )}
            {activeTab === "users" && (
              <div>
                <h4 className="text-2xl font-bold text-purple-700 mb-3">
                  Users
                </h4>
                <p className="text-gray-600">
                  This section has Users content. Team member management and
                  permissions go here.
                </p>
              </div>
            )}
            {activeTab === "reports" && (
              <div>
                <h4 className="text-2xl font-bold text-purple-700 mb-3">
                  Reports
                </h4>
                <p className="text-gray-600">
                  This section has Reports content. Analytics and performance
                  metrics are displayed here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

function Home() {
  return (
    <ProtectedTeamPortal>
      <TeamBDashboard />
    </ProtectedTeamPortal>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
});
