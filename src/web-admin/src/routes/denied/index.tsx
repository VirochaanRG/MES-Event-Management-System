import AdminLayout from "@/components/AdminLayout";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
        if (sessionUser.roles && sessionUser.roles.includes("admin")) {
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
      subtitle="Acess Denied"
    ></AdminLayout>
  );
}
