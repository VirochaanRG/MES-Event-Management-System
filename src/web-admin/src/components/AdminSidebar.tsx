import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  X,
  Lock,
} from "lucide-react";
import { logout, AuthUser } from "../lib/auth";
import { getUserPermissions } from "../lib/access";

interface AdminSidebarProps {
  user: AuthUser;
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Get user permissions
  const permissions = getUserPermissions(user.roles);

  const navigationItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
      canAccess: permissions.canAccessDashboard,
    },
    {
      name: "Events",
      icon: Calendar,
      path: "/events",
      canAccess: permissions.canAccessEvents,
    },
    {
      name: "Users",
      icon: Users,
      path: "/users",
      canAccess: permissions.canAccessUsers,
    },
    {
      name: "Analytics",
      icon: BarChart3,
      path: "/analytics",
      canAccess: permissions.canAccessAnalytics,
    },
    {
      name: "Form Builder",
      icon: FileText,
      path: "/form-builder",
      canAccess: permissions.canAccessForms,
    },
  ];

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
      // Check if we are already at the root
      if (window.location.pathname === "/") {
        window.location.reload();
      } else {
        navigate({ to: "/" });
      }
    }
  };

  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-20"
      } bg-gray-900 text-white transition-all duration-300 ease-in-out flex flex-col h-screen sticky top-0`}
    >
      {/* Logo/Header */}
      <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 bg-gray-800 border-b border-gray-700">
        {sidebarOpen ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-yellow-500 rounded-lg flex items-center justify-center font-bold text-sm">
                AD
              </div>
              <span className="font-bold text-lg">Admin Panel</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 hover:bg-gray-700 rounded transition-colors mx-auto"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navigationItems.map((item) => {
          if (!item.canAccess) {
            // Show locked item
            return (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-3 rounded-lg opacity-50 cursor-not-allowed"
                title={`Requires ${item.name.toLowerCase()} role`}
              >
                <Lock className="w-5 h-5 text-gray-500" />
                {sidebarOpen && (
                  <span className="font-medium text-gray-500">{item.name}</span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-800 transition-colors group"
              activeProps={{
                className: "bg-gray-800",
              }}
            >
              <item.icon className="w-5 h-5 text-yellow-500 group-hover:text-yellow-400" />
              {sidebarOpen && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="flex-shrink-0 border-t border-gray-700 p-4 bg-gray-900">
        {sidebarOpen ? (
          <div className="mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-yellow-500 rounded-full flex items-center justify-center font-bold">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                {user.roles && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs text-yellow-400 truncate"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
