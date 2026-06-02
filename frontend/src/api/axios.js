import axios from "axios";

/**
 * Base URL Configuration
 * In enterprise HRMS systems, this is usually injected via environment variables.
 * Example:
 * VITE_API_BASE_URL=http://localhost:8000/api
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/**
 * Token management
 * Persist token in sessionStorage so page reloads keep session,
 * while still clearing on logout or 401 responses.
 */
const STORAGE_KEY = "hrms_access_token";

let accessToken = null;

// initialize from sessionStorage if available
try {
  accessToken = sessionStorage.getItem(STORAGE_KEY) || null;
} catch (e) {
  accessToken = null;
}

export const tokenService = {
  getToken: () => accessToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null),
  setToken: (token) => {
    accessToken = token;
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch (e) {
      // ignore storage errors
    }
  },
  clearToken: () => {
    accessToken = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }
};

/**
 * Axios instance
 */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

/**
 * Request Interceptor
 * - Inject JWT token
 * - Normalize headers
 */
api.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers.Accept = "application/json";
    return config;
  },
  (error) => {
    return Promise.reject({
      success: false,
      message: "Request configuration error",
      error: error?.message || error
    });
  }
);

/**
 * Response Interceptor
 * - Normalize success responses
 * - Handle API errors globally
 * - Standardize error shape for UI layer
 */
api.interceptors.response.use(
  (response) => {
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  },
  (error) => {
    const normalizedError = {
      success: false,
      status: error?.response?.status || 500,
      message:
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Unknown server error",
      data: error?.response?.data || null
    };

    // Global auth failure handling
    if (normalizedError.status === 401) {
      tokenService.clearToken();
      window.dispatchEvent(new Event("auth:logout"));
    }

    return Promise.reject(normalizedError);
  }
);

export default api;