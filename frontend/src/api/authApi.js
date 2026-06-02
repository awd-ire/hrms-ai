import api from "@/api/axios";

/**
 * Auth API
 * Backend:
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh
 * GET  /api/auth/me
 */

export const authApi = {
  login: (payload) => api.post("/auth/login", payload),

  logout: () => api.post("/auth/logout"),

  refresh: () => api.post("/auth/refresh"),

  me: () => api.get("/auth/me")
};