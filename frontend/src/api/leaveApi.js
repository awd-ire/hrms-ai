import api from "@/api/axios";

/**
 * Leave API
 */

export const leaveApi = {
  request: (payload) => api.post("/leave/request", payload),

  myLeaves: () => api.get("/leave/my"),

  balance: (id) => api.get(`/leave/balance/${id}`),

  pending: () => api.get("/leave/pending"),

  approve: (id) => api.put(`/leave/${id}/approve`),

  reject: (id, payload) => api.put(`/leave/${id}/reject`, payload),

  analytics: () => api.get("/leave/analytics")
};
