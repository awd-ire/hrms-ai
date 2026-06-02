import api from "@/api/axios";

/**
 * Recruitment API
 */

export const recruitmentApi = {
  getJobs: () => api.get("/recruitment/jobs"),

  createJob: (payload) => api.post("/recruitment/jobs", payload),

  updateJob: (id, payload) =>
    api.put(`/recruitment/jobs/${id}`, payload),

  deleteJob: (id) => api.delete(`/recruitment/jobs/${id}`),

  createCandidate: (payload) =>
    api.post("/recruitment/candidates", payload),

  getCandidates: () => api.get("/recruitment/candidates"),

  getCandidateById: (id) =>
    api.get(`/recruitment/candidates/${id}`),

  updateStage: (id, payload) =>
    api.put(`/recruitment/candidates/${id}/stage`, payload),

  createInterview: (payload) =>
    api.post("/recruitment/interviews", payload),

  interviewFeedback: (id, payload) =>
    api.put(`/recruitment/interviews/${id}/feedback`, payload),

  analytics: () => api.get("/recruitment/analytics")
};