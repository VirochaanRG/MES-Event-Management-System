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
    <div className="min-h-screen bg-white flex">
      <AdminSidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div>
            {title && (
              <h1 className="text-4xl font-bold text-red-900">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-red-900 border border-yellow-300 rounded-full">
              <span className="text-xs font-semibold text-yellow-300">
                {user.email} - admin
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
