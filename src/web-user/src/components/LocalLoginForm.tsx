import { useState, useEffect } from "react";
import { AuthUser } from "../lib/auth";
import { motion, AnimatePresence } from "framer-motion";

interface LocalLoginFormProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
  prefilledEmail?: string;
}

export default function LocalLoginForm({
  onLoginSuccess,
  prefilledEmail,
}: LocalLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

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
              {isLogin ? "MES Events" : "Join the MES Community."}
            </h2>
            <p className="mt-4 text-yellow-300/70 font-medium">
              Access the latest MES events, mixers, and technical seminars.
            </p>
          </div>
        </div>

        {/* Right Side: Action Area */}
        <div className="md:w-7/12 p-12 md:p-20 flex flex-col justify-center bg-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login" : "register"}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-10">
                <span className="text-red-900 font-black uppercase tracking-widest text-xs py-1 px-3 bg-red-50 rounded-full border border-red-100">
                  {isLogin ? "Student Access" : "New Registration"}
                </span>
                <h3 className="text-4xl font-black text-red-900 mt-4">
                  {isLogin ? "Login to Account" : "Create Student Profile"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                      Student Email (McMaster)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. j.doe@mcmaster.ca"
                      className="w-full px-6 py-4 bg-gray-50 rounded-xl border-2 border-transparent focus:border-red-900 focus:bg-white outline-none transition-all text-gray-900 font-bold"
                      required
                    />
                  </div>
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
                </div>

                {error && (
                  <div className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-12 py-4 bg-red-900 hover:bg-black text-yellow-300 font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-red-900/30 active:scale-95"
                  >
                    {isLoading
                      ? "Authenticating..."
                      : isLogin
                        ? "Login"
                        : "Register"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError("");
                    }}
                    className="text-red-900/40 hover:text-red-900 font-bold text-sm uppercase tracking-tighter transition-colors"
                  >
                    {isLogin ? "Create an Account?" : "Already a member?"}
                  </button>
                </div>
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
