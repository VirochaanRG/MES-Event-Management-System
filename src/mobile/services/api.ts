/**
 * Team D API Client for Mobile
 *
 * This module is derived from the original `mobile-components` package. It
 * exposes functions for fetching data from the Team D API while handling
 * token storage automatically via AsyncStorage. All type definitions are
 * imported from the local `../types` module rather than relying on
 * external `@large-event/api-types` dependencies. This allows the
 * application to be built on Windows without needing a separate package.
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Import shared types from our local types file. These mirror the
// structures found in the shared API type definitions.
import type { InstanceResponse, InstanceListResponse } from '../types';

// Determine the base URL for the Team D API. Use localhost for
// development and the production URL otherwise. Android emulators
// require a special loopback address to reach the host machine.
const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:3004/api';
    }
    // iOS simulator and web use standard localhost
    return 'http://localhost:3004/api';
  }
  // Production environment
  return 'https://api.large-event.com/api/v1/teamD';
};

const API_BASE_URL = getApiBaseUrl();
const TOKEN_KEY = '@large-event/auth_token';

// Create an axios instance configured for the Team D API. The timeout
// ensures requests fail gracefully rather than hanging indefinitely.
const teamDApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: automatically add the Authorization header if a
// token is available in AsyncStorage.
teamDApiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: unwrap the standardized `{ success, data }`
// response format used by the backend. Also clear the stored token if
// the server returns a 401 status code.
teamDApiClient.interceptors.response.use(
  (response) => {
    if (response.data?.success) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  },
);

// Instances API: provides functions for retrieving instance data. These
// methods return promises that resolve to typed objects defined in
// ../types.ts. Having these wrappers centralizes API logic and error
// handling.
export const teamDInstances = {
  /**
   * Fetch all instances the current user has access to.
   */
  getInstances: async (): Promise<InstanceListResponse> => {
    const response = await teamDApiClient.get<{
      instances: InstanceResponse[];
      count: number;
    }>('/instances');
    return {
      instances: response.data.instances || [],
      count: response.data.count || 0,
    };
  },

  /**
   * Retrieve a specific instance by its unique identifier.
   */
  getInstance: async (id: number): Promise<InstanceResponse> => {
    const response = await teamDApiClient.get<{ instance: InstanceResponse }>(`/instances/${id}`);
    return response.data.instance;
  },
};

// Users API: exposes user-related endpoints. Additional user
// endpoints can be added here as needed.
export const teamDUsers = {
  /**
   * Fetch the current user's profile. The return type is loosely
   * inferred from the backend; adjust as necessary if the API changes.
   */
  getProfile: async () => {
    const response = await teamDApiClient.get('/users/me/profile');
    return response.data.profile;
  },
};

// Simple token storage helpers. These encapsulate AsyncStorage access
// behind a small API, making it easier to swap storage mechanisms if
// required in the future.
export const tokenStorage = {
  save: async (token: string) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  get: async () => {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  remove: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};
