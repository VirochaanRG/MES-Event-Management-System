import { useState, useEffect } from "react";
import { AuthUser } from "../lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { config } from "../../../config/config";

interface LocalLoginFormProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
  prefilledEmail?: string;
}

type AuthMode = "login" | "register" | "forgot" | "reset";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LocalLoginForm({
  onLoginSuccess,
  prefilledEmail,
}: LocalLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode: AuthMode) => {
    clearMessages();
    setMode(nextMode);
    setPassword("");
    setTempPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    if (isRegister && !EMAIL_REGEX.test(email.trim())) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data.user, data.token);
        sessionStorage.setItem("teamd-auth-user", JSON.stringify(data.user));
        sessionStorage.setItem("teamd-auth-token", data.token);
        sessionStorage.setItem("teamd-auth-source", "local");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Authentication failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      setSuccess(
        "If an account exists for that email, a temporary password has been sent.",
      );
      setTimeout(() => {
        switchMode("reset");
      }, 1200);
    } catch {
      setError("Failed to send temporary password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !tempPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          tempPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "Password reset failed");
        return;
      }

      setSuccess("Password reset successful. You can now log in.");
      setPassword("");
      setTimeout(() => {
        switchMode("login");
      }, 1200);
    } catch {
      setError("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto my-12 px-4">
      <div className="bg-white rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(127,17,17,0.2)] overflow-hidden flex flex-col md:flex-row border border-gray-100 min-h-[650px]">
        {/* Left Side: Branding/Society Info (Red-900 Area) */}
        <div className="md:w-5/12 bg-red-900 p-12 text-yellow-300 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Grid Pattern Overlay */}
          {/* <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          /> */}

          <div className="relative z-10">
            <h1 className="text-6xl font-black tracking-tighter uppercase mb-2 underline italic">
              EvEngage
            </h1>
            {/* <div className="h-1 w-12 bg-yellow-300 mb-8" /> */}
            <p className="text-6xl font-black leading-none uppercase italic opacity-20 absolute -left-4 bottom-48 rotate-90 origin-left whitespace-nowrap select-none">
              MES EVENTS
            </p>
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold leading-tight">
              {isLogin ? "MES Events" : "Create your EvEngage account."}
            </h2>
            <p className="mt-4 text-yellow-300/70 font-medium">
              Access the latest MES events and find out what we're up to!
            </p>
          </div>
        </div>

        {/* Right Side: Action Area */}
        <div className="md:w-7/12 p-12 md:p-20 flex flex-col justify-center bg-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-10">
                <span className="text-red-900 font-black uppercase tracking-widest text-xs py-1 px-3 bg-red-50 rounded-full border border-red-100">
                  {isLogin && "Student Access"}
                  {isRegister && "New Registration"}
                  {isForgot && "Password Recovery"}
                  {isReset && "Reset Password"}
                </span>
                <h3 className="text-4xl font-black text-red-900 mt-4">
                  {isLogin && "Login to Account"}
                  {isRegister && "Create Student Profile"}
                  {isForgot && "Request Temporary Password"}
                  {isReset && "Set A New Password"}
                </h3>
              </div>

              <form
                onSubmit={
                  isForgot
                    ? handleForgotPassword
                    : isReset
                      ? handleResetPassword
                      : handleSubmit
                }
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. j.doe@example.com"
                      className="w-full px-6 py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-900 focus:bg-white outline-none transition-all text-gray-900 font-bold"
                      required
                    />
                  </div>
                  {!isForgot && !isReset && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-6 py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-900 focus:bg-white outline-none transition-all text-gray-900 font-bold"
                        required
                      />
                    </div>
                  )}
                  {isReset && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                          Temporary Password
                        </label>
                        <input
                          type="text"
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          placeholder="From your email"
                          className="w-full px-6 py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-900 focus:bg-white outline-none transition-all text-gray-900 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full px-6 py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-900 focus:bg-white outline-none transition-all text-gray-900 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full px-6 py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-900 focus:bg-white outline-none transition-all text-gray-900 font-bold"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-green-700 text-sm font-bold bg-green-50 p-3 rounded-lg border border-green-100">
                    {success}
                  </div>
                )}

                <div
                  className={`pt-4 flex items-center gap-6 ${
                    isForgot || isReset
                      ? "flex-col justify-center"
                      : "flex-col sm:flex-row"
                  }`}
                >
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-12 py-4 bg-red-900 hover:bg-black text-yellow-300 font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-red-900/30 active:scale-95 ${
                      isForgot || isReset
                        ? "w-full max-w-sm mx-auto"
                        : "w-full sm:w-auto"
                    }`}
                  >
                    {isLoading
                      ? "Authenticating..."
                      : isLogin
                        ? "Login"
                        : isRegister
                          ? "Register"
                          : isForgot
                            ? "Send Temporary Password"
                            : "Reset Password"}
                  </button>

                  {(isLogin || isRegister) && (
                    <button
                      type="button"
                      onClick={() => {
                        switchMode(isLogin ? "register" : "login");
                      }}
                      className="text-red-900/40 hover:text-red-900 font-bold text-sm uppercase tracking-tighter transition-colors"
                    >
                      {isLogin ? "Create an Account?" : "Already a member?"}
                    </button>
                  )}
                </div>

                {isLogin && (
                  <div className="flex flex-col items-start gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-sm font-bold text-red-900 hover:text-black transition-colors"
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-sm font-bold text-red-900 hover:text-black transition-colors"
                    >
                      I already have a temporary password
                    </button>
                  </div>
                )}

                {(isForgot || isReset) && (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-sm font-bold text-red-900 hover:text-black transition-colors text-center"
                    >
                      Back to login
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-8 opacity-30 grayscale hover:grayscale-0 transition-all">
        <div className="text-[10px] font-black text-red-900 uppercase tracking-widest">
          McMaster Engineering Society
        </div>
        <div className="text-[10px] font-black text-red-900 uppercase tracking-widest">
          Powered by EvEngage
        </div>
      </div>
    </div>
  );
}
