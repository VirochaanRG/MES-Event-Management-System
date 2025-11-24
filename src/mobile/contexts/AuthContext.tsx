import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser, InstanceResponse } from '../types';

/**
 * Simplified authentication context
 *
 * The original mobile app used axios and the Team D API to authenticate
 * the user and load their accessible instances. For standalone
 * development we want behaviour closer to the `web-user` project: a
 * lightweight email login with no backend integration. This context
 * stores a dummy user and token in `AsyncStorage` so that sessions
 * persist between app restarts, but it never contacts any remote
 * services. Instances are not loaded from the API; instead an empty
 * array is returned.
 */

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  instances: InstanceResponse[];
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshInstances: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keys used for persisting auth state in AsyncStorage
const STORAGE_USER_KEY = '@teamd/auth_user';
const STORAGE_TOKEN_KEY = '@teamd/auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Instances are not fetched from the API in standalone mode. We
  // initialise this as an empty array and never modify it. Keeping
  // the property in the context preserves the shape expected by the
  // existing screens.
  const [instances] = useState<InstanceResponse[]>([]);

  useEffect(() => {
    // Load any stored user and token from AsyncStorage on mount
    const loadAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(STORAGE_USER_KEY);
        const storedToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (err) {
        console.warn('[AuthProvider] Failed to load stored auth', err);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  /**
   * Perform a local login. This function mimics the behaviour of the
   * `LocalLoginForm` component in the web-user project. It accepts an
   * email address and creates a dummy `AuthUser` object along with a
   * simple token string. Both values are saved to AsyncStorage to
   * persist across sessions. There is no password input or server
   * validation.
   */
  const login = async (email: string): Promise<void> => {
    // Trim the email and validate
    const trimmed = email.trim();
    if (!trimmed) {
      throw new Error('Email is required');
    }
    // Construct a dummy user. The id is derived from the current
    // timestamp to guarantee uniqueness within the session. The name
    // mirrors the email for simplicity.
    const dummyUser: AuthUser = {
      id: Date.now(),
      email: trimmed,
      name: trimmed,
      isSystemAdmin: false,
    };
    const dummyToken = 'local-auth-token';
    setUser(dummyUser);
    setToken(dummyToken);
    // Persist the user and token
    await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(dummyUser));
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, dummyToken);
  };

  /**
   * Clear the stored user and token. This resets the authentication
   * state and removes any saved credentials from AsyncStorage.
   */
  const logout = async (): Promise<void> => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_USER_KEY);
    await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
  };

  /**
   * In standalone mode there are no instances to refresh. This method
   * is provided for compatibility with the previous API-based context
   * but simply resolves without changing state.
   */
  const refreshInstances = async (): Promise<void> => {
    return Promise.resolve();
  };

  const value: AuthContextType = {
    user,
    token,
    instances,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    refreshInstances,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}