import api from "@/api/axios";

/**
 * Employees API
 */

export const employeeApi = {
  getAll: () => api.get("/employees"),

  getById: (id) => api.get(`/employees/${id}`),

  create: (payload) => api.post("/employees", payload),

  update: (id, payload) => api.put(`/employees/${id}`, payload),

  delete: (id) => api.delete(`/employees/${id}`),

  summary: (id) => api.get(`/employees/${id}/summary`),

  myTeam: () => api.get("/employees/my-team")
};