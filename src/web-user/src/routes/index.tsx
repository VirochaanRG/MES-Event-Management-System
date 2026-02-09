import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import AvailableEvents from "../components/AvailableEvents";
import PhotoCarousel from "../components/PhotoCarousel";
import { useState, useEffect } from "react";
import AvailableSurveys from "@/components/AvailableSurveys";
import RegisteredEvents from "@/components/RegisteredEvents";
import CompletedSurveys from "@/components/CompletedSurveys";

function HomePage() {
  const { user, logout } = useAuth();
  const [isLocalAuth, setIsLocalAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "surveys">(
    "overview",
  );
  const [eventsSubTab, setEventsSubTab] = useState<"available" | "registered">(
    "available",
  );
  const [surveysSubTab, setSurveysSubTab] = useState<"available" | "completed">(
    "available",
  );
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const authSource = sessionStorage.getItem("teamd-auth-source");
    setIsLocalAuth(authSource === "local");
  }, [user]);

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-red-900 text-white shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">
                McMaster Engineering Society
              </h1>
              <p className="text-yellow-300 text-sm mt-1">Events and Surveys</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-yellow-500 hover:bg-yellow-600 text-red-900 font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="truncate">{user?.email}</span>
                <span className="text-lg">▼</span>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-yellow-300 z-50">
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-yellow-50 font-medium border-b border-gray-200"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-yellow-50 font-medium border-b border-gray-200"
                  >
                    Settings
                  </button>
                  {isLocalAuth && (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-medium"
                    >
                      Logout
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b-2 border-yellow-500">
          <div className="max-w-7xl mx-auto px-6 flex justify-center">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-8 font-semibold transition-all border-b-4 ${
                activeTab === "overview"
                  ? "border-yellow-500 text-red-900"
                  : "border-transparent text-gray-600 hover:text-red-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 px-8 font-semibold transition-all border-b-4 ${
                activeTab === "events"
                  ? "border-yellow-500 text-red-900"
                  : "border-transparent text-gray-600 hover:text-red-900"
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab("surveys")}
              className={`py-4 px-8 font-semibold transition-all border-b-4 ${
                activeTab === "surveys"
                  ? "border-yellow-500 text-red-900"
                  : "border-transparent text-gray-600 hover:text-red-900"
              }`}
            >
              Surveys
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-red-900 mb-3">
                  Welcome to MES Events
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  The one stop location to see what the MES is up to!
                </p>
              </div>

              {/* Photo Carousel */}
              <PhotoCarousel />
            </div>
          )}

          {activeTab === "events" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-red-900 mb-2">Events</h2>
              </div>

              {/* Events Sub-tabs */}
              <div className="bg-white rounded-lg shadow-md mb-8 border-b border-yellow-300">
                <div className="flex justify-center gap-8 px-6">
                  <button
                    onClick={() => setEventsSubTab("available")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      eventsSubTab === "available"
                        ? "border-yellow-500 text-red-900"
                        : "border-transparent text-gray-600 hover:text-red-900"
                    }`}
                  >
                    Available Events
                  </button>
                  <button
                    onClick={() => setEventsSubTab("registered")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      eventsSubTab === "registered"
                        ? "border-yellow-500 text-red-900"
                        : "border-transparent text-gray-600 hover:text-red-900"
                    }`}
                  >
                    Registered Events
                  </button>
                </div>
              </div>

              {/* Available Events Content */}
              {eventsSubTab === "available" && (
                <div>
                  <AvailableEvents />
                </div>
              )}

              {/* Registered Events Content */}
              {eventsSubTab === "registered" && (
                <div>
                  <RegisteredEvents />
                </div>
              )}
            </div>
          )}

          {activeTab === "surveys" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-red-900 mb-2">
                  Surveys
                </h2>
              </div>

              {/* Surveys Sub-tabs */}
              <div className="bg-white rounded-lg shadow-md mb-8 border-b border-yellow-300">
                <div className="flex justify-center gap-8 px-6">
                  <button
                    onClick={() => setSurveysSubTab("available")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      surveysSubTab === "available"
                        ? "border-yellow-500 text-red-900"
                        : "border-transparent text-gray-600 hover:text-red-900"
                    }`}
                  >
                    Available Surveys
                  </button>
                  <button
                    onClick={() => setSurveysSubTab("completed")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      surveysSubTab === "completed"
                        ? "border-yellow-500 text-red-900"
                        : "border-transparent text-gray-600 hover:text-red-900"
                    }`}
                  >
                    Completed Surveys
                  </button>
                </div>
              </div>

              {/* Available Surveys Content */}
              {surveysSubTab === "available" && (
                <div>
                  <AvailableSurveys />
                </div>
              )}

              {/* Completed Surveys Content */}
              {surveysSubTab === "completed" && (
                <div>
                  <CompletedSurveys />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-red-900 text-yellow-300 mt-12 py-8">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm">
              © 2025 McMaster Engineering Society. Event Management System.
            </p>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
