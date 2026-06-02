import api from "@/api/axios";

/**
 * Analytics API
 */

export const analyticsApi = {
  company: () => api.get("/analytics/company"),
  recruitment: () => api.get("/analytics/recruitment"),
  attendance: () => api.get("/analytics/attendance")
};
