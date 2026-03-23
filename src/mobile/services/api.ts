import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getHostIP(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost ??
    '';
  const host = debuggerHost.split(':')[0];
  if (host) return host;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

const HOST = getHostIP();
const BASE_URL = `http://${HOST}:3114/api`;
const ADMIN_BASE_URL = `http://${HOST}:3124/api`;

const REQUEST_TIMEOUT = 5000;

let authToken: string | null = null;

const addAuthCookie = (config: any) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers['Cookie'] = `auth-token=${authToken}`;
  }
  return config;
};

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT,
});

export const adminApiClient = axios.create({
  baseURL: ADMIN_BASE_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT,
});

api.interceptors.request.use(addAuthCookie);
adminApiClient.interceptors.request.use(addAuthCookie);

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export interface ApiUser {
  id: number;
  email: string;
  roles?: string[];
}
