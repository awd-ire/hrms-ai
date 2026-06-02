import api from "@/api/axios";

/**
 * Attendance API
 */

export const attendanceApi = {
  checkIn: () => api.post("/attendance/check-in"),

  checkOut: () => api.post("/attendance/check-out"),

  myAttendance: () => api.get("/attendance/my"),

  getByEmployee: (id) => api.get(`/attendance/employee/${id}`),

  teamAttendance: () => api.get("/attendance/team"),

  analytics: () => api.get("/attendance/analytics"),

  correct: (id, payload) =>
    api.put(`/attendance/${id}/correct`, payload)
};