import axios from "axios";

/**
 * Base URL Configuration
 * In enterprise HRMS systems, this is usually injected via environment variables.
 * Example:
 * VITE_API_BASE_URL=http://localhost:8000/api
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

/**
 * In-memory token storage (STRICT REQUIREMENT)
 * JWT must NOT be persisted in localStorage/sessionStorage.
 */
let accessToken = null;

/**
 * Token management (single source of truth)
 */
export const tokenService = {
  getToken: () => accessToken,
  setToken: (token) => {
    accessToken = token;
  },
  clearToken: () => {
    accessToken = null;
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