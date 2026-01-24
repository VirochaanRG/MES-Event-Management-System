import { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { hasRole, Role } from "../lib/access";

interface RequireRoleProps {
  children: ReactNode;
  userRoles: string[] | undefined;
  requiredRole: Role;
  redirectTo?: string;
}

export default function RequireRole({
  children,
  userRoles,
  requiredRole,
  redirectTo = "/",
}: RequireRoleProps) {
  const navigate = useNavigate();

  // Check if user has required role
  const hasAccess = hasRole(userRoles, requiredRole);

  if (!hasAccess) {
    // Redirect to dashboard or show unauthorized message
    setTimeout(() => {
      navigate({ to: redirectTo });
    }, 0);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this section. Required role:{" "}
            <span className="font-semibold text-red-600">{requiredRole}</span>
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
