import { useState } from "react";
import { AuthUser } from "../lib/auth";

interface LocalLoginFormProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

const TEST_ACCOUNTS = [
  { email: "admin1@teamd.com", password: "admin123456" },
  { email: "admin2@teamd.com", password: "admin123456" },
  { email: "admin3@teamd.com", password: "admin123456" },
];

export default function LocalLoginForm({
  onLoginSuccess,
}: LocalLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem(
          "teamd-admin-auth-user",
          JSON.stringify(data.user),
        );
        sessionStorage.setItem("teamd-admin-auth-token", data.token);
        sessionStorage.setItem("teamd-admin-auth-source", "local");

        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (error) {
      setError("Login failed. Please try again.");
      console.error("Admin login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#800020]/10 to-[#D4AF37]/10 p-6">
      <div className="gap-8 w-3/4 max-w-5xl">
        {/* Login Panel */}
        <div className="md:col-span-2 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="text-[#800020] mb-5 text-3xl text-center font-bold tracking-tight">
            Admin Portal - Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#660018] disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-md"
            >
              {loading ? "Logging in..." : "Login to Admin Portal"}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              <strong>Note:</strong> Only users with admin role can access this
              portal.
            </p>
          </div>
        </div>

        {/* Quick Login Panel
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
          <h3 className="text-gray-700 font-semibold text-md mb-4 text-center">
            Test Admin Accounts
          </h3>

          <div className="flex flex-col gap-3">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                onClick={() => quickLogin(account)}
                className="w-full px-4 py-3 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-lg cursor-pointer text-[#800020] hover:bg-[#D4AF37]/30 transition-colors text-sm shadow-sm text-left"
              >
                <div className="font-semibold mb-1">{account.email}</div>
                <div className="text-xs text-gray-600">
                  Password: {account.password}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Click any account to auto-fill credentials. These accounts must
              have the 'admin' role in the database.
            </p>
          </div>
        </div> */}
      </div>
    </div>
  );
}
