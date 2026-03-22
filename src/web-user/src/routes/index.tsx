import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import AvailableEvents from "../components/AvailableEvents";
import "../styles/carousel.css";
import { useState, useEffect, useRef } from "react";
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

type HomeTab = "home" | "events" | "surveys";
type EventsSubTab = "available" | "registered";
type SurveysSubTab = "available" | "completed";

type HomeSearch = {
  tab?: HomeTab;
  eventsSubTab?: EventsSubTab;
  surveysSubTab?: SurveysSubTab;
};

function HomePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLocalAuth, setIsLocalAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>(search.tab ?? "home");
  const [eventsSubTab, setEventsSubTab] = useState<EventsSubTab>(
    search.eventsSubTab ?? "available",
  );
  const [surveysSubTab, setSurveysSubTab] = useState<SurveysSubTab>(
    search.surveysSubTab ?? "available",
  );
  const [showMenu, setShowMenu] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "home") {
      setLoadingFeatured(true);
      fetch("/api/events", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const featured =
              data.data.find((e: Event) => e.isFeatured) ??
              data.data[0] ??
              null;
            setFeaturedEvent(featured);
          }
          setLoadingFeatured(false);
        })
        .catch(() => setLoadingFeatured(false));
    }
  }, [activeTab]);

  useEffect(() => {
    const authSource = sessionStorage.getItem("teamd-auth-source");
    setIsLocalAuth(authSource === "local");
  }, [user]);

  useEffect(() => {
    const loadProfileStatus = async () => {
      if (!user?.id && !user?.email) {
        setHasProfile(false);
        return;
      }

      try {
        const endpoint = user.id
          ? `/api/profiles/${user.id}`
          : `/api/profiles?email=${encodeURIComponent(user.email)}`;

        const res = await fetch(endpoint, {
          credentials: "include",
        });
        const json = await res.json();

        setHasProfile(Boolean(json?.success && json?.data));
      } catch {
        setHasProfile(false);
      }
    };

    loadProfileStatus();
  }, [user?.id, user?.email]);

  useEffect(() => {
    setActiveTab(search.tab ?? "home");
    setEventsSubTab(search.eventsSubTab ?? "available");
    setSurveysSubTab(search.surveysSubTab ?? "available");
  }, [search.tab, search.eventsSubTab, search.surveysSubTab]);

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const showProfileBanner = hasProfile === false;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-amber-50/40 flex flex-col text-stone-900">
        {/* ─── Navbar ─── */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-red-950/95 backdrop-blur-md border-b border-yellow-300/25 shadow-lg shadow-red-950/25">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
            {/* Wordmark */}
            <span className="text-yellow-300 font-extrabold italic text-xl tracking-tight shrink-0">
              EvENGage
            </span>

            {/* Nav tabs */}
            <nav className="flex items-center gap-3 sm:gap-5 flex-1 justify-center">
              {(["home", "events", "surveys"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-yellow-300 text-red-950"
                      : "text-yellow-100/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {tab === "home" ? "Home" : tab}
                </button>
              ))}
            </nav>

            {/* User menu */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-yellow-300/20 rounded-full pl-1 pr-3 py-1 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-yellow-300 text-red-900 flex items-center justify-center text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="text-white/75 text-sm max-w-[120px] truncate">
                  {user?.email}
                </span>
                <span className="text-white/40 text-xs">▾</span>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-red-950 border border-yellow-300/30 rounded-xl overflow-hidden shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-white/8">
                    <p className="text-white/35 text-xs uppercase tracking-widest mb-0.5">
                      Signed in as
                    </p>
                    <p className="text-yellow-300 text-sm font-medium truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate({ to: "/profile" });
                    }}
                    className="w-full text-left px-4 py-3 text-white/75 hover:bg-yellow-300/15 hover:text-yellow-300 text-sm flex items-center gap-2 transition-colors"
                  >
                    {hasProfile === false ? "👤 Set Up Profile" : "👤 Profile"}
                  </button>
                  {isLocalAuth && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-3 text-red-400/90 hover:bg-red-900/20 text-sm flex items-center gap-2 transition-colors"
                    >
                      🚪 Logout
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {showProfileBanner && (
          <div className="fixed top-16 left-0 right-0 z-40 bg-red-900 border-y-4 border-yellow-300 shadow-2xl">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-yellow-200 text-sm md:text-base font-black uppercase tracking-wide">
                Set up your profile now. Complete your profile before
                continuing.
              </p>
              <button
                onClick={() => navigate({ to: "/profile" })}
                className="bg-yellow-300 hover:bg-yellow-200 text-red-900 font-extrabold uppercase text-xs tracking-widest px-4 py-2 rounded-md border-2 border-yellow-100 shadow"
              >
                Set Up Profile
              </button>
            </div>
          </div>
        )}

        {/* ─── Main ─── */}
        <main className={`flex-1 ${showProfileBanner ? "pt-16" : ""}`}>
          {/* ══════ HOME TAB ══════ */}
          {activeTab === "home" && (
            <>
              {/* 1. Full-screen Hero */}
              <section className="relative h-screen min-h-[600px] overflow-hidden flex items-center">
                {/* Background: image with fallback gradient */}
                {!heroImageFailed ? (
                  <>
                    <img
                      src="/api/images/hero"
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => setHeroImageFailed(true)}
                    />
                    {/* Dark overlay on top of image */}
                    <div className="absolute inset-0 bg-red-950/70" />
                  </>
                ) : (
                  /* Gradient fallback */
                  <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-900 to-stone-950">
                    {/* Subtle gold glow */}
                    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-yellow-400/6 rounded-full blur-2xl" />
                    {/* Diagonal texture lines */}
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(-45deg, white, white 1px, transparent 1px, transparent 60px)",
                      }}
                    />
                  </div>
                )}

                {/* Hero text content */}
                <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 w-full">
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.25em] mb-5">
                    McMaster Engineering Society
                  </p>
                  <h1 className="text-6xl md:text-8xl font-black text-yellow-300 leading-none tracking-tight drop-shadow-[0_6px_22px_rgba(0,0,0,0.35)]">
                    Where Engineers
                  </h1>
                  <h1 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tight italic drop-shadow-[0_6px_22px_rgba(0,0,0,0.35)]">
                    Come Together
                  </h1>
                  <p className="mt-7 text-white/60 text-lg max-w-md leading-relaxed">
                    Discover events, share your voice through surveys, and build
                    the McMaster Engineering community — all in one place.
                  </p>
                  <div className="mt-8 flex items-center gap-4 flex-wrap">
                    <button
                      onClick={() => setActiveTab("events")}
                      className="bg-yellow-300 hover:bg-yellow-200 text-red-900 font-extrabold text-sm px-7 py-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-yellow-400/30 hover:-translate-y-0.5"
                    >
                      Browse Events →
                    </button>
                    <button
                      onClick={scrollToContent}
                      className="text-white/75 hover:text-white font-semibold text-sm px-6 py-3 rounded-full border border-white/30 hover:border-yellow-300/70 transition-all duration-200 bg-white/5"
                    >
                      Learn More
                    </button>
                  </div>
                </div>

                {/* Scroll arrow — anchored to bottom center, fully clickable */}
                <button
                  onClick={scrollToContent}
                  aria-label="Scroll to content"
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 group cursor-pointer bg-transparent border-none p-2"
                >
                  <span className="text-yellow-400/50 text-[10px] font-semibold uppercase tracking-[0.2em] group-hover:text-yellow-400/80 transition-colors">
                    Scroll
                  </span>
                  {/* Animated line + chevron */}
                  <div className="flex flex-col items-center animate-bounce">
                    <div className="w-px h-5 bg-gradient-to-b from-yellow-400/50 to-transparent" />
                    <div className="w-3 h-3 border-r-2 border-b-2 border-yellow-400/70 rotate-45 -mt-1.5 group-hover:border-yellow-400 transition-colors" />
                  </div>
                </button>
              </section>

              {/* 2. Featured Event */}
              <section ref={contentRef} className="bg-amber-50 py-20 px-6">
                <div className="max-w-6xl mx-auto">
                  {/* Section label */}
                  <div className="flex items-center gap-3 mb-8">
                    <span className="text-red-900 text-xs font-bold uppercase tracking-[0.2em]">
                      Featured Event
                    </span>
                    <div className="h-px w-16 bg-red-900/25" />
                  </div>

                  {loadingFeatured ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl bg-white animate-pulse">
                      <div className="bg-stone-200 min-h-[380px]" />
                      <div className="p-10 flex flex-col gap-4">
                        {[100, 72, 55, 45].map((w, i) => (
                          <div
                            key={i}
                            className="bg-stone-200 rounded-lg"
                            style={{
                              height: i === 0 ? 36 : 16,
                              width: `${w}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : featuredEvent ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white border border-red-100">
                      {/* Left: Image or gradient */}
                      <div className="relative min-h-[380px] overflow-hidden bg-red-900">
                        <FeaturedEventImage
                          eventId={featuredEvent.id}
                          name={featuredEvent.name}
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                        {/* Featured badge */}
                        <span className="absolute top-4 left-4 bg-yellow-300 text-red-900 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md">
                          ⭐ Featured
                        </span>
                        {/* Cost badge */}
                        {featuredEvent.cost !== null && (
                          <span
                            className={`absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-full shadow-md ${featuredEvent.cost === 0 ? "bg-green-500 text-white" : "bg-white text-red-900"}`}
                          >
                            {featuredEvent.cost === 0
                              ? "Free"
                              : `$${featuredEvent.cost}`}
                          </span>
                        )}
                      </div>

                      {/* Right: Details */}
                      <div className="p-10 flex flex-col justify-between gap-6">
                        <div>
                          <p className="text-red-900 text-xs font-bold uppercase tracking-[0.18em] mb-2">
                            Don't Miss Out
                          </p>
                          <h3 className="text-3xl font-black text-stone-900 leading-tight">
                            {featuredEvent.name}
                          </h3>
                          <p className="mt-4 text-stone-500 text-sm leading-relaxed line-clamp-4">
                            {featuredEvent.description}
                          </p>
                        </div>

                        <div className="flex flex-col gap-3">
                          {[
                            {
                              icon: "📅",
                              text: formatDate(featuredEvent.startTime),
                            },
                            {
                              icon: "⏰",
                              text: `${formatTime(featuredEvent.startTime)} – ${formatTime(featuredEvent.endTime)}`,
                            },
                            { icon: "📍", text: featuredEvent.location },
                            ...(featuredEvent.capacity
                              ? [
                                  {
                                    icon: "👥",
                                    text: `${featuredEvent.capacity} spots available`,
                                  },
                                ]
                              : []),
                          ].map(({ icon, text }) => (
                            <div
                              key={text}
                              className="flex items-center gap-3 text-sm text-stone-700"
                            >
                              <span className="w-8 h-8 bg-yellow-300/30 rounded-lg flex items-center justify-center text-base shrink-0">
                                {icon}
                              </span>
                              {text}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() =>
                            navigate({ to: `/events/${featuredEvent.id}` })
                          }
                          className="w-full bg-red-900 hover:bg-red-800 text-yellow-300 font-bold text-sm py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                          Register Now →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-stone-100">
                      <div className="text-5xl mb-4">📅</div>
                      <p className="text-stone-500 text-sm">
                        No featured events right now — check back soon!
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* 3. Photo Carousel */}
              <section className="bg-red-950 py-20 px-6 relative">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />

                <div className="max-w-6xl mx-auto">
                  <p className="text-center text-white/30 text-xs font-semibold uppercase tracking-[0.25em] mb-3">
                    McMaster Engineering Society
                  </p>
                  <h2 className="text-center text-yellow-300 text-4xl md:text-5xl font-black italic mb-12">
                    See What We've Been Up To
                  </h2>
                  <PhotoCarousel />
                </div>
              </section>
            </>
          )}

          {/* ══════ EVENTS TAB ══════ */}
          {activeTab === "events" && (
            <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
              {/* Title + description */}
              <div className="mb-6">
                <h2 className="text-3xl font-black text-red-950">Events</h2>
                <p className="text-stone-500 text-sm mt-1">
                  Browse upcoming MES events and manage your registrations.
                </p>
              </div>

              {/* Subtab underline nav */}
              <div className="flex border-b border-red-100 mb-8">
                <button
                  onClick={() => setEventsSubTab("available")}
                  className={`pb-3 mr-8 text-sm font-semibold border-b-2 -mb-px transition-all duration-200 flex items-center gap-2 ${
                    eventsSubTab === "available"
                      ? "border-red-900 text-red-900"
                      : "border-transparent text-stone-400 hover:text-red-900"
                  }`}
                >
                  Available Events
                  {availableCount !== null && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        eventsSubTab === "available"
                          ? "bg-yellow-300 text-red-900"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {availableCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setEventsSubTab("registered")}
                  className={`pb-3 mr-8 text-sm font-semibold border-b-2 -mb-px transition-all duration-200 flex items-center gap-2 ${
                    eventsSubTab === "registered"
                      ? "border-red-900 text-red-900"
                      : "border-transparent text-stone-400 hover:text-red-900"
                  }`}
                >
                  My Registrations
                  {registeredCount !== null && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        eventsSubTab === "registered"
                          ? "bg-yellow-300 text-red-900"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {registeredCount}
                    </span>
                  )}
                </button>
              </div>

              {eventsSubTab === "available" && (
                <AvailableEvents onCountChange={setAvailableCount} />
              )}
              {eventsSubTab === "registered" && (
                <RegisteredEvents onCountChange={setRegisteredCount} />
              )}
            </div>
          )}

          {/* ══════ SURVEYS TAB ══════ */}
          {activeTab === "surveys" && (
            <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
              {/* Title + description */}
              <div className="mb-6">
                <h2 className="text-3xl font-black text-red-950">Surveys</h2>
                <p className="text-stone-500 text-sm mt-1">
                  Share your feedback and help shape the MES experience.
                </p>
              </div>

              {/* Subtab underline nav */}
              <div className="flex border-b border-red-100 mb-8">
                {(["available", "completed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSurveysSubTab(tab)}
                    className={`pb-3 mr-8 text-sm font-semibold border-b-2 -mb-px transition-all duration-200 whitespace-nowrap ${
                      surveysSubTab === tab
                        ? "border-red-900 text-red-900"
                        : "border-transparent text-stone-400 hover:text-red-900"
                    }`}
                  >
                    {tab === "available"
                      ? "Available Surveys"
                      : "Completed Surveys"}
                  </button>
                ))}
              </div>

              {surveysSubTab === "available" && <AvailableSurveys />}
              {surveysSubTab === "completed" && <CompletedSurveys />}
            </div>
          )}
        </main>

        {/* ─── Footer ─── */}
        <footer className="bg-red-950 border-t border-yellow-300/15 py-6 text-center">
          <p className="text-white/25 text-xs tracking-wider">
            © 2025 McMaster Engineering Society ·{" "}
            <span className="text-yellow-400/45 italic">EvENGage</span> Platform
          </p>
        </footer>
      </div>
    </ProtectedRoute>
  );
}

/** Tries to load the event image; falls back to a gradient swatch */
function FeaturedEventImage({
  eventId,
  name,
}: {
  eventId: number;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-red-800 to-stone-900 flex items-center justify-center">
        <span className="text-7xl select-none">🎉</span>
      </div>
    );
  }

  return (
    <img
      src={`/api/images/event/${eventId}`}
      alt={name}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setFailed(true)}
    />
  );
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const tab =
      search.tab === "home" ||
      search.tab === "events" ||
      search.tab === "surveys"
        ? search.tab
        : search.tab === "overview"
          ? "home"
          : undefined;

    const eventsSubTab =
      search.eventsSubTab === "available" ||
      search.eventsSubTab === "registered"
        ? search.eventsSubTab
        : undefined;

    const surveysSubTab =
      search.surveysSubTab === "available" ||
      search.surveysSubTab === "completed"
        ? search.surveysSubTab
        : undefined;

    return { tab, eventsSubTab, surveysSubTab };
  },
  component: HomePage,
});
