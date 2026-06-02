import api from "@/api/axios";

/**
 * AI API (Ollama-backed services)
 */

export const aiApi = {
  status: () => api.get("/ai/status"),

  resumeScreen: (formData) =>
    api.post("/ai/resume/screen", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),

  resumeRank: (payload) =>
    api.post("/ai/resume/rank", payload),

  chatRecruitment: (payload) =>
    api.post("/ai/chat/recruitment", payload),

  chatInterview: (payload) =>
    api.post("/ai/chat/interview", payload),

  transcribeVoice: (formData) =>
    api.post("/ai/voice/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),

  conductInterview: (payload) =>
    api.post("/ai/interview/conduct", payload)
};