import axios from "./axios";

const interviewTimeout = 120000;

export const publicPortalApi = {
  getJobs: () => axios.get("/public/jobs"),
  startLiveInterview: (data) =>
    axios.post("/public/interview/live/start", data, { timeout: interviewTimeout }),
  continueLiveInterview: (sessionId, formData) =>
    axios.post(`/public/interview/live/${sessionId}`, formData, {
      timeout: interviewTimeout,
    }),
  apply: (formData) => axios.post("/public/apply", formData),
  getCandidateStatus: (candidateId, email) =>
    axios.get(`/public/candidates/${candidateId}`, {
      params: { email },
    }),
  conductInterview: (formData) =>
    axios.post("/public/interview", formData, { timeout: interviewTimeout }),
};

export default publicPortalApi;
