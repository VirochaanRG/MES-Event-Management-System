import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser, logout } from "../lib/auth";
import ProtectedTeamPortal from "../components/ProtectedTeamPortal";
import EventsTab from "@/components/EventsTab";
import ReportsTab from "@/components/ReportsTab";
import Navbar from "@/components/Navbar";

function TeamBDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "users" | "reports">(
    "events",
  );
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = () => {
      // Check session storage
      const sessionUser = getCurrentUser("admin");
      console.log(sessionUser);
      if (sessionUser) {
        // Verify user has admin role
        if (sessionUser.roles && sessionUser.roles.includes("admin")) {
          setUser(sessionUser);
        } else {
          console.error("User does not have admin role");
          logout("admin");
          navigate({ to: "" });
        }
      } else {
        // No session, redirect to login
        navigate({ to: "" });
      }

      setIsLoading(false);
    };

    initAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout("admin");
      navigate({ to: "" });
    }
  };

  const handleFormBuilder = () => {
    navigate({ to: "/form-builder" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar onLogout={handleLogout} user={user} />
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white border-l-4 border-red-900 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-stone-900">
                  Admin Dashboard
                </h1>
                <p className="text-stone-600 mt-2">
                  Logged in as:{" "}
                  <span className="font-semibold">{user.email}</span>
                  {user.roles && (
                    <span className="ml-2 px-2 py-1 bg-red-900 text-white text-xs rounded">
                      {user.roles.join(", ")}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-stone-200 text-stone-700 hover:bg-stone-300 font-semibold rounded transition-colors"
              >
                Logout
              </button>
            </div>
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
                    User management coming soon...
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
