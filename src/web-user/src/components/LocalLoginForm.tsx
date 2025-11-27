import { useState, useEffect } from 'react';
import { AuthUser } from '../lib/auth';

interface LocalLoginFormProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
  prefilledEmail?: string;
}

const TEST_ACCOUNTS = [
  { email: 'userViro@test.com', id: 1 },
  { email: 'userM@test.com', id: 2 },
  { email: 'userI@test.com', id: 3 },
  { email: 'userO@test.com', id: 4 },
  { email: 'userR@test.com', id: 5 },
];

export default function LocalLoginForm({ onLoginSuccess, prefilledEmail }: LocalLoginFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user && data.token) {
          // Store auth info
          sessionStorage.setItem('teamd-auth-user', JSON.stringify(data.user));
          sessionStorage.setItem('teamd-auth-token', data.token);
          sessionStorage.setItem('teamd-auth-source', 'local');

          onLoginSuccess(data.user, data.token);
        } else {
          setError('Invalid response from server');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-6 max-w-4xl mx-auto">
      {/* Login Form */}
      <div className="flex-1 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            User Portal
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg border-none text-base font-medium transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-700 cursor-pointer'
            } text-white`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Test Accounts Sidebar */}
      <div className="w-72 bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Test Accounts
        </h3>
        <p className="text-sm text-gray-600 mb-5">
          Click to populate email field
        </p>
        <div className="space-y-3">
          {TEST_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              onClick={() => setEmail(account.email)}
              type="button"
              className="w-full text-left px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <div className="font-medium text-blue-900 text-sm">
                {account.email}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}