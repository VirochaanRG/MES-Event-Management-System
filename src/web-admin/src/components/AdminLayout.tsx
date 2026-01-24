import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import { AuthUser } from "../lib/auth";

interface AdminLayoutProps {
  user: AuthUser;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminLayout({
  user,
  children,
  title,
  subtitle,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-gradient-to-r from-red-50 to-yellow-50 border border-red-200 rounded-full">
              <span className="text-xs font-semibold text-red-700">
                Admin Access
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
