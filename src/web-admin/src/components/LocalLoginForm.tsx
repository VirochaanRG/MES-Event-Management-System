import { useState } from 'react';
import { AuthUser } from '../lib/auth';

interface LocalLoginFormProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

const TEST_ACCOUNTS = [
  { email: 'userViro@test.com', id: 1 },
  { email: 'userM@test.com', id: 2 },
  { email: 'userI@test.com', id: 3 },
  { email: 'userO@test.com', id: 4 },
  { email: 'userR@test.com', id: 5 },
];

export default function LocalLoginForm({ onLoginSuccess }: LocalLoginFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('teamd-auth-user', JSON.stringify(data.user));
        sessionStorage.setItem('teamd-auth-token', data.token);
        sessionStorage.setItem('teamd-auth-source', 'local');

        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      console.error('Local login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#800020]/10 to-[#D4AF37]/10 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">

        {/* Login Panel */}
        <div className="md:col-span-2 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="text-[#800020] mb-5 text-3xl text-center font-bold tracking-tight">
            Admin Portal - Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="email"
              placeholder="Enter your TeamD email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#660018] disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-md"
            >
              {loading ? 'Logging in...' : 'Login to TeamD'}
            </button>

            {error && (
              <div className="text-red-600 text-sm text-center font-medium">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Quick Login Panel */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 h-fit">
          <h3 className="text-gray-700 font-semibold text-md mb-4 text-center">
            Quick Login Accounts
          </h3>

          <div className="flex flex-col gap-3">
            {TEST_ACCOUNTS.map(account => (
              <button
                key={account.email}
                onClick={() => quickLogin(account.email)}
                className="w-full px-4 py-3 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-lg cursor-pointer text-[#800020] hover:bg-[#D4AF37]/30 transition-colors text-sm shadow-sm text-left"
              >
                <div className="font-semibold">{account.email}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
