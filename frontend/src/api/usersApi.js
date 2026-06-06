import api from "@/api/axios";

/**
 * Users API
 */

export const usersApi = {
  employeeCandidates: () => api.get("/users/employee-candidates"),
  create: (payload) => api.post("/users/create", payload),
};
