import axios from "./axios";

export const publicPortalApi = {
  getJobs: () => axios.get("/public/jobs"),
  startLiveInterview: (data) => axios.post("/public/interview/live/start", data),
  continueLiveInterview: (sessionId, formData) =>
    axios.post(`/public/interview/live/${sessionId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  apply: (formData) =>
    axios.post("/public/apply", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getCandidateStatus: (candidateId, email) =>
    axios.get(`/public/candidates/${candidateId}`, {
      params: { email },
    }),
  conductInterview: (formData) =>
    axios.post("/public/interview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default publicPortalApi;
