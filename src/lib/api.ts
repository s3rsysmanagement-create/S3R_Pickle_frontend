import axios, { type AxiosRequestConfig } from 'axios';

import type { ApiEnvelope, AuthUser } from '../types';

const TOKEN_KEYS = ['pickle_token', 'picklefront_token'];

const getStoredToken = () =>
  TOKEN_KEYS.map((key) => localStorage.getItem(key) ?? sessionStorage.getItem(key)).find(Boolean) ?? null;

const setStoredToken = (token: string | null) => {
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  if (!token) {
    return;
  }

  sessionStorage.setItem(TOKEN_KEYS[0], token);
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = {
      ...(config.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    } as typeof config.headers;
  }

  return config;
});

const normalizeApiError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { success?: boolean; error?: { message?: string }; message?: string }
      | undefined;

    const backendMessage = data?.success === false && data.error?.message
      ? data.error.message
      : data?.message;

    if (backendMessage) {
      return new Error(backendMessage);
    }

    if (error.response?.status === 400) {
      return new Error('The request was invalid. Please check your input and try again.');
    }

    if (error.response?.status === 401) {
      return new Error('Your session has expired. Please sign in again.');
    }

    if (error.response?.status === 403) {
      return new Error('You do not have permission to access this resource.');
    }

    if (error.response?.status === 404) {
      return new Error('The requested resource could not be found.');
    }

    if (error.response?.status === 500) {
      return new Error('The server could not complete this request. Please try again later.');
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Request failed');
};

export const requestApi = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await apiClient.request<T | ApiEnvelope<T>>(config);
    const payload = response.data as ApiEnvelope<T>;

    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (payload.success) {
        return (payload.data ?? ({} as T));
      }

      const message = payload.error?.message ?? 'Request failed';
      throw new Error(message);
    }

    return response.data as T;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await requestApi<{ user: AuthUser; token: string }>({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });

    setStoredToken(response.token);
    return response;
  },
  logout: async () => {
    setStoredToken(null);
    await requestApi({ method: 'POST', url: '/auth/logout' }).catch(() => undefined);
  },
  me: async () => {
    // The backend has returned this either flat ({ id, email, role }) or
    // wrapped ({ user: { id, email, role } }) across versions; support both.
    const response = await requestApi<AuthUser | { user: AuthUser }>({ method: 'GET', url: '/auth/me' });
    return 'user' in response ? response.user : response;
  },
};

export const tokenStorage = {
  clear: () => setStoredToken(null),
  get: getStoredToken,
};
