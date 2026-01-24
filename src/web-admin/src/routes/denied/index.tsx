import AdminLayout from "@/components/AdminLayout";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Home, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/denied/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const initAuth = () => {
      const sessionUser = getCurrentUser("admin");
      console.log(sessionUser);
      if (sessionUser) {
        if (sessionUser.roles?.includes("admin")) {
          setCurrentUser(sessionUser);
        } else {
          console.error("User does not have admin role");
          logout("admin");
          navigate({ to: "/" });
        }
      } else {
        navigate({ to: "/" });
      }
      setIsLoading(false);
    };

    initAuth();
  }, [navigate]);

  if (!currentUser) {
    return null;
  }
  return (
    <AdminLayout
      user={currentUser}
      title="Access Denied"
      subtitle="Permission Error"
    >
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <ShieldAlert className="w-16 h-16 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Required Role Missing
        </h1>

        <p className="text-gray-600 mb-8 max-w-md">
          Your account does not have the necessary permissions to access this
          page. Please contact an administrator if you believe this is a
          mistake.
        </p>

        <Link
          to="/"
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </AdminLayout>
  );
}
