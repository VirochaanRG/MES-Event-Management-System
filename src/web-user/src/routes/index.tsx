import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import AvailableEvents from "../components/AvailableEvents";
import "../styles/carousel.css";
import { useState, useEffect } from "react";
import AvailableSurveys from "@/components/AvailableSurveys";
import RegisteredEvents from "@/components/RegisteredEvents";
import CompletedSurveys from "@/components/CompletedSurveys";
import { PhotoCarousel } from "@/components/PhotoCarousel";

interface Event {
  id: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
  cost: number | null;
  isFeatured?: boolean;
}

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
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const navigate = useNavigate();

  // Fetch featured events
  useEffect(() => {
    if (activeTab === "overview") {
      fetch("/api/events", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // Filter for featured events (assuming isFeatured flag exists or pick first 3)
            const featured = data.data
              .filter((event: Event) => event.isFeatured)
              .slice(0, 3);
            setFeaturedEvents(
              featured.length > 0 ? featured : data.data.slice(0, 3),
            );
          }
          setLoadingFeatured(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingFeatured(false);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    const authSource = sessionStorage.getItem("teamd-auth-source");
    setIsLocalAuth(authSource === "local");
  }, [user]);

  const handleLogout = () => {
    setShowMenu(false);
    logout();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-rose-50 flex flex-col">
        {/* Header */}
        <header className="bg-red-900 text-white shadow-2xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-yellow-400 underline decoration-2 tracking-tight">
                  EvENGage
                </h1>
                <p className="text-amber-300 text-xs mt-0.5 font-medium">
                  McMaster Engineering Society
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-yellow-400 hover:bg-yellow-300 text-rose-900 font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <div className="w-8 h-8 bg-red-900 rounded-full flex items-center justify-center text-yellow-400 text-sm font-bold">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="truncate max-w-[150px]">{user?.email}</span>
                <span className="text-sm">▼</span>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-rose-50 border-b border-gray-200">
                    <p className="text-xs text-gray-500 font-medium">
                      Signed in as
                    </p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
                  >
                    <span className="text-lg">👤</span>
                    Profile
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center gap-2 border-b border-gray-100"
                  >
                    <span className="text-lg">⚙️</span>
                    Settings
                  </button>
                  {isLocalAuth && (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-rose-900 hover:bg-rose-50 font-medium transition-colors flex items-center gap-2"
                    >
                      <span className="text-lg">🚪</span>
                      Logout
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white shadow-md border-b-2 border-yellow-400">
          <div className="max-w-7xl mx-auto px-6 flex justify-center gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-8 font-semibold transition-all duration-200 border-b-4 relative ${
                activeTab === "overview"
                  ? "border-yellow-500 text-rose-900 bg-yellow-50"
                  : "border-transparent text-gray-600 hover:text-rose-900 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">🏠</span>
                Overview
              </span>
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-4 px-8 font-semibold transition-all duration-200 border-b-4 relative ${
                activeTab === "events"
                  ? "border-yellow-500 text-rose-900 bg-yellow-50"
                  : "border-transparent text-gray-600 hover:text-rose-900 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">🎉</span>
                Events
              </span>
            </button>
            <button
              onClick={() => setActiveTab("surveys")}
              className={`py-4 px-8 font-semibold transition-all duration-200 border-b-4 relative ${
                activeTab === "surveys"
                  ? "border-yellow-500 text-rose-900 bg-yellow-50"
                  : "border-transparent text-gray-600 hover:text-rose-900 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                Surveys
              </span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          {activeTab === "overview" && (
            <div className="space-y-10">
              {/* Welcome Section */}
              <div className="text-center bg-white rounded-2xl shadow-lg p-8 border-t-4 border-yellow-400">
                <h2 className="text-4xl font-bold text-rose-900 mb-3">
                  Welcome to{" "}
                  <span className="text-yellow-500 underline decoration-4">
                    EvENGage
                  </span>
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Discover exciting events, connect with fellow engineers, and
                  make the most of your McMaster experience!
                </p>
              </div>

              {/* Featured Events Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-rose-900 flex items-center gap-2">
                    <span className="text-3xl">⭐</span>
                    Featured Events
                  </h3>
                  <button
                    onClick={() => setActiveTab("events")}
                    className="text-rose-900 hover:text-rose-700 font-semibold text-sm flex items-center gap-1 transition-colors"
                  >
                    View All Events →
                  </button>
                </div>

                {loadingFeatured ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl shadow-md h-80 animate-pulse"
                      >
                        <div className="h-40 bg-gray-200 rounded-t-xl"></div>
                        <div className="p-5 space-y-3">
                          <div className="h-6 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : featuredEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer transform hover:-translate-y-1 border border-gray-100"
                      >
                        <div className="relative h-44 bg-red-900 overflow-hidden">
                          <img
                            src={`api/images/event/${event.id}`}
                            alt={event.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute top-3 right-3 bg-yellow-400 text-rose-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            FEATURED
                          </div>
                          {event.cost !== null && event.cost > 0 && (
                            <div className="absolute top-3 left-3 bg-white text-rose-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              ${event.cost}
                            </div>
                          )}
                          {event.cost === 0 && (
                            <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              FREE
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h4 className="font-bold text-lg text-rose-900 mb-2 line-clamp-1 group-hover:text-rose-700 transition-colors">
                            {event.name}
                          </h4>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {event.description}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="text-yellow-500">📅</span>
                              <span className="font-medium">
                                {formatDate(event.startTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="text-yellow-500">⏰</span>
                              <span>
                                {formatTime(event.startTime)} -{" "}
                                {formatTime(event.endTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <span className="text-yellow-500">📍</span>
                              <span className="line-clamp-1">
                                {event.location}
                              </span>
                            </div>
                            {event.capacity && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <span className="text-yellow-500">👥</span>
                                <span>{event.capacity} spots available</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab("events");
                              setEventsSubTab("available");
                            }}
                            className="mt-4 w-full bg-red-900 hover:bg-rose-800 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <h4 className="text-xl font-semibold text-gray-700 mb-2">
                      No Featured Events Yet
                    </h4>
                    <p className="text-gray-500">
                      Check back soon for exciting upcoming events!
                    </p>
                  </div>
                )}
              </div>

              {/* Photo Carousel */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-yellow-400">
                <h3 className="text-2xl font-bold text-rose-900 mb-6 text-center">
                  Recent Event Highlights
                </h3>
                <div className="w-full max-w-5xl mx-auto">
                  <PhotoCarousel />
                </div>
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-rose-900 mb-2">
                  Events
                </h2>
                <p className="text-gray-600">
                  Explore and register for upcoming MES events
                </p>
              </div>

              {/* Events Sub-tabs */}
              <div className="bg-white rounded-xl shadow-md mb-8 border-b border-yellow-300">
                <div className="flex justify-center gap-8 px-6">
                  <button
                    onClick={() => setEventsSubTab("available")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      eventsSubTab === "available"
                        ? "border-yellow-500 text-rose-900"
                        : "border-transparent text-gray-600 hover:text-rose-900"
                    }`}
                  >
                    Available Events
                  </button>
                  <button
                    onClick={() => setEventsSubTab("registered")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      eventsSubTab === "registered"
                        ? "border-yellow-500 text-rose-900"
                        : "border-transparent text-gray-600 hover:text-rose-900"
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
                <h2 className="text-3xl font-bold text-rose-900 mb-2">
                  Surveys
                </h2>
                <p className="text-gray-600">
                  Share your feedback and help improve MES
                </p>
              </div>

              {/* Surveys Sub-tabs */}
              <div className="bg-white rounded-xl shadow-md mb-8 border-b border-yellow-300">
                <div className="flex justify-center gap-8 px-6">
                  <button
                    onClick={() => setSurveysSubTab("available")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      surveysSubTab === "available"
                        ? "border-yellow-500 text-rose-900"
                        : "border-transparent text-gray-600 hover:text-rose-900"
                    }`}
                  >
                    Available Surveys
                  </button>
                  <button
                    onClick={() => setSurveysSubTab("completed")}
                    className={`py-4 px-6 font-semibold transition-all border-b-4 ${
                      surveysSubTab === "completed"
                        ? "border-yellow-500 text-rose-900"
                        : "border-transparent text-gray-600 hover:text-rose-900"
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
        <footer className="bg-red-900 text-amber-300 mt-12 py-8 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-medium">
              © 2025 McMaster Engineering Society.{" "}
              <span className="font-bold underline decoration-2">EvENGage</span>{" "}
              Platform.
            </p>
            <p className="text-xs text-yellow-200 mt-1">
              Building community, one event at a time.
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
