import { useEffect, useState } from "react";
import { getCurrentUser, AuthUser } from "../lib/auth";
import LocalLoginForm from "./LocalLoginForm";

interface ProtectedTeamPortalProps {
  children: React.ReactNode;
}

function UnauthorizedAccess({
  onLocalLogin,
}: {
  onLocalLogin: (user: AuthUser, token: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "20px",
        backgroundColor: "#f8f9fa",
        textAlign: "center",
        gap: "20px",
      }}
    >
      <LocalLoginForm onLoginSuccess={onLocalLogin} />
    </div>
  );
}

export default function ProtectedTeamPortal({
  children,
}: ProtectedTeamPortalProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log("Checking auth..."); // Debug log

      // First check local auth
      const currentUser = getCurrentUser("admin");
      console.log("Current user:", currentUser); // Debug log

      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
        return;
      }
      setLoading(false);
    };

    // Check immediately
    checkAuth();

    // Listen for storage changes (if user logs out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "teamd-auth-user" && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "18px",
          color: "#666",
        }}
      >
        Loading...
      </div>
    );
  }

  const handleLocalLogin = (authUser: AuthUser, token: string) => {
    console.log("Local login successful:", authUser);
    setUser(authUser);
  };

  if (!user) {
    return <UnauthorizedAccess onLocalLogin={handleLocalLogin} />;
  }

  return <div>{children}</div>;
}
