import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser, logout } from "../lib/auth";
import ProtectedTeamPortal from "../components/ProtectedTeamPortal";
import EventsTab from "@/components/EventsTab";
import ReportsTab from "@/components/ReportsTab";
import AdminLayout from "@/components/AdminLayout";
import HomePageManagement from "@/components/HomePageManagement";
import { Calendar, Users, FileText } from "lucide-react";

interface DashboardStats {
  totalEvents: number;
  totalUsers: number;
  totalFormResponses: number;
}

function TeamBDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = () => {
      const sessionUser = getCurrentUser("admin");
      if (sessionUser) {
        if (sessionUser.roles && sessionUser.roles.includes("admin")) {
          setUser(sessionUser);
        } else {
          console.error("User does not have admin role");
          logout("admin");
          if (window.location.pathname === "/") {
            window.location.reload();
          } else {
            navigate({ to: "/" });
          }
        }
      } else {
        if (window.location.pathname === "/") {
          window.location.reload();
        } else {
          navigate({ to: "/" });
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    bgColor,
  }: {
    title: string;
    value: number;
    icon: any;
    bgColor: string;
  }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {statsLoading ? (
              <div className="h-10 w-20 bg-gray-200 animate-pulse rounded mt-2"></div>
            ) : (
              <p className="text-4xl font-bold text-gray-900 mt-2">{value}</p>
            )}
          </div>
          <div
            className={`w-14 h-14 ${bgColor} rounded-lg flex items-center justify-center`}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout user={user} title="Dashboard">
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            title="Total Events"
            value={stats?.totalEvents ?? 0}
            icon={Calendar}
            bgColor="bg-red-600"
          />

          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            bgColor="bg-yellow-600"
          />

          <StatCard
            title="Form Responses"
            value={stats?.totalFormResponses ?? 0}
            icon={FileText}
            bgColor="bg-red-600"
          />
        </div>

        {/* Home Page Management Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-red-600">
            Home Page Management
          </h2>
          <HomePageManagement />
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-red-600">
            Recent Activity
          </h2>
          <EventsTab />
        </div>

        {/* Analytics Overview Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-yellow-500">
            Analytics Overview
          </h2>
          <ReportsTab />
        </div>
      </div>
    </AdminLayout>
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
