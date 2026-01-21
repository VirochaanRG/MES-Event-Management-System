import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import AvailableEvents from "../components/AvailableEvents";
import "../styles/carousel.css";
import { useState, useEffect } from "react";

function HomePage() {
  const { user, logout } = useAuth();
  const [isLocalAuth, setIsLocalAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "events">("overview");
  const [eventsSubTab, setEventsSubTab] = useState<"available" | "registered">(
    "available"
  );
  const [showMenu, setShowMenu] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const carouselImages = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Image ${i + 1}`,
  }));

  const nextSlide = () => {
    setDirection("next");
    setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setDirection("prev");
    setCarouselIndex(
      (prev) => (prev - 1 + carouselImages.length) % carouselImages.length
    );
  };

  const getVisibleImages = () => {
    const visible: { id: number; title: string }[] = [];
    for (let i = 0; i < 3; i++) {
      visible.push(carouselImages[(carouselIndex + i) % carouselImages.length]);
    }
    return visible;
  };

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
              <p className="text-yellow-300 text-sm mt-1">
                Event Management System
              </p>
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
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
          {activeTab === "overview" && (
            <div className="space-y-12">
              {/* Welcome Section */}
              <div className="text-center">
                <h2 className="text-4xl font-bold text-red-900 mb-4">
                  Welcome to MES Event Management
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Manage, organize, and coordinate all McMaster Engineering
                  Society events in one place.
                </p>
              </div>

              {/* Photo Carousel */}
              <div className="relative">
                {/* Carousel Container */}
                <div
                  className={`carousel-container ${
                    direction === "prev" ? "prev" : ""
                  } flex gap-6 overflow-hidden`}
                >
                  {getVisibleImages().map((image) => (
                    <div
                      key={image.id}
                      className="flex-1 min-w-0 bg-gradient-to-br from-red-200 to-yellow-200 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                    >
                      <div className="w-full aspect-video flex items-center justify-center">
                        <span className="text-gray-600 font-semibold text-lg">
                          {image.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Previous Button */}
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 z-10 bg-yellow-500 hover:bg-yellow-600 text-red-900 rounded-full p-3 transition-colors font-bold text-lg"
                >
                  ❮
                </button>

                {/* Next Button */}
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 z-10 bg-yellow-500 hover:bg-yellow-600 text-red-900 rounded-full p-3 transition-colors font-bold text-lg"
                >
                  ❯
                </button>
              </div>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCarouselIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === carouselIndex ? "bg-red-900" : "bg-yellow-500"
                    }`}
                  />
                ))}
              </div>
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
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-gray-600 text-lg">
                    Registered events coming soon...
                  </p>
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
