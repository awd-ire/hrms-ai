import api from "@/api/axios";

/**
 * Department API
 */

export const departmentApi = {
  getAll: () => api.get("/departments"),
  create: (payload) => api.post("/departments", payload),
  update: (id, payload) => api.put(`/departments/${id}`, payload),
  remove: (id) => api.delete(`/departments/${id}`)
};
