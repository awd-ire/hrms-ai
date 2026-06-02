import api from "@/api/axios";

/**
 * Performance API
 */

export const performanceApi = {
  createReview: (payload) => api.post("/performance/review", payload),

  myPerformance: () => api.get("/performance/my"),

  teamPerformance: () => api.get("/performance/team"),

  update: (id, payload) => api.put(`/performance/${id}`, payload),

  analytics: () => api.get("/performance/analytics")
};