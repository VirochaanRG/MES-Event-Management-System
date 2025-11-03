import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check for URL auth token (from main portal)
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth');

      if (authToken) {
        try {
          const payload = JSON.parse(atob(authToken.split('.')[1]));
          if (payload.user?.email) {
            sessionStorage.setItem('auth-token', authToken);
            sessionStorage.setItem('teamd-auth-source', 'main');
            setUser(payload.user);

            // Clean up URL to remove auth token
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Failed to decode auth token:', error);
        }
      }

      // Check for stored session token (only if it was from main portal or local)
      const storedToken = sessionStorage.getItem('auth-token');
      const authSource = sessionStorage.getItem('teamd-auth-source');

      if (storedToken && authSource) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          if (payload.user?.email && payload.exp > Date.now() / 1000) {
            setUser(payload.user);
            setIsLoading(false);
            return;
          } else {
            // Token expired, clear storage
            sessionStorage.removeItem('auth-token');
            sessionStorage.removeItem('teamd-auth-source');
          }
        } catch (error) {
          // Invalid token, clear storage
          sessionStorage.removeItem('auth-token');
          sessionStorage.removeItem('teamd-auth-source');
        }
      }

      // If accessed directly (no URL token and no stored auth), check local Team D auth only
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          sessionStorage.setItem('teamd-auth-source', 'local');
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string): Promise<boolean> => {
    try {
      // Try local Team D login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          sessionStorage.setItem('auth-token', data.token);
          sessionStorage.setItem('teamd-auth-source', 'local');
        }
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      sessionStorage.removeItem('auth-token');
      sessionStorage.removeItem('teamd-auth-source');
      sessionStorage.removeItem('teamd-auth-user');
      sessionStorage.removeItem('teamd-auth-token');
      setUser(null);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}