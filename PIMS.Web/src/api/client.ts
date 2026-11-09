import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const TOKEN_STORAGE_KEY = 'pims_auth_token';
export const USER_STORAGE_KEY = 'pims_auth_user';

// Create a centralized Axios instance configured with Vite proxy base
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach JWT Bearer token if stored
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors & session expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear expired credentials
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);

      // Redirect to login if not already there
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?sessionExpired=true&returnUrl=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
      }
    }

    return Promise.reject(error);
  }
);

// Utility to extract human-readable error messages from backend responses
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    if (data && typeof data === 'object') {
      // Check auth envelope { success: false, error: "..." }
      if ('error' in data && typeof (data as { error?: unknown }).error === 'string') {
        return (data as { error: string }).error;
      }

      // Check controller message { message: "..." }
      if ('message' in data && typeof (data as { message?: unknown }).message === 'string') {
        return (data as { message: string }).message;
      }

      // Check GlobalExceptionMiddleware { title: "...", message: "..." }
      if ('title' in data && typeof (data as { title?: unknown }).title === 'string') {
        const title = (data as { title: string }).title;
        const msg = (data as { message?: string }).message;
        return msg && msg !== title ? `${title}: ${msg}` : title;
      }
    }

    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }

    if (error.response?.status === 404) {
      return 'The requested resource was not found.';
    }

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check backend availability at http://localhost:5204.';
    }

    if (!error.response && error.request) {
      return 'Cannot reach backend server. Please verify the backend is running at http://localhost:5204.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
