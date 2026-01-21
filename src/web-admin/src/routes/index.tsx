import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser } from "../lib/auth";
import ProtectedTeamPortal from "../components/ProtectedTeamPortal";
import EventsTab from "@/components/EventsTab";
import ReportsTab from "@/components/ReportsTab";
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
      <Navbar />
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white border-l-4 border-red-900 p-6 mb-6">
            <h1 className="text-3xl font-bold text-stone-900">
              Admin Dashboard
            </h1>
          </div>

          <div className="bg-white border border-stone-300">
            <div className="border-b-2 border-stone-300 bg-stone-100 px-6 py-4 flex justify-between items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("events")}
                  className={`px-6 py-2 font-semibold transition-colors ${
                    activeTab === "events"
                      ? "bg-red-900 text-white"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-6 py-2 font-semibold transition-colors ${
                    activeTab === "users"
                      ? "bg-red-900 text-white"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`px-6 py-2 font-semibold transition-colors ${
                    activeTab === "reports"
                      ? "bg-red-900 text-white"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  Form Analytics
                </button>
              </div>
              <button
                onClick={handleFormBuilder}
                className="px-6 py-2 font-semibold bg-red-900 text-white hover:bg-red-950 transition-colors"
              >
                Form Builder
              </button>
            </div>

            <div className="p-6">
              {activeTab === "events" && (
                <div>
                  <EventsTab />
                </div>
              )}
              {activeTab === "users" && (
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 mb-3 border-b-2 border-red-900 pb-2 inline-block">
                    Users
                  </h2>
                  <p className="text-stone-600 mt-4">
                    //TODO
                  </p>
                </div>
              )}
              {activeTab === "reports" && (
                <div>
                  <ReportsTab />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
