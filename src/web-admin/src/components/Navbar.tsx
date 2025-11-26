import React, { useEffect, useState } from "react";

export default function Navbar() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [authSource, setAuthSource] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("teamd-auth-user");
    const storedSource = sessionStorage.getItem("teamd-auth-source");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        console.warn("Invalid user JSON in sessionStorage");
      }
    }

    setAuthSource(storedSource);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("teamd-auth-user");
    sessionStorage.removeItem("teamd-auth-token");
    sessionStorage.removeItem("teamd-auth-source");
    window.location.reload();
  };

  return (
    <nav
      className="
        w-full 
        bg-white 
        border
        border-[#D4AF37]/40 
        shadow-sm 
        px-8 py-4
        flex items-center justify-between
      "
    >
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <div className="text-sm text-[#800020] font-medium tracking-wide">
          {user ? (
            <>
              Authenticated as:{" "}
              <span className="font-semibold">{user.email}</span>
            </>
          ) : (
            "Not authenticated"
          )}
        </div>
      </div>

      {/* Logout */}
      {authSource === "local" && (
        <button
          onClick={handleLogout}
          className="
            text-white text-sm font-medium tracking-wide 
            bg-[#800020] 
            hover:bg-[#660018]
            px-4 py-2 
            rounded-md 
            transition-all
            shadow-sm
          "
        >
          Logout
        </button>
      )}
    </nav>
  );
}
