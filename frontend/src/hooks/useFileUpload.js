import { useState, useCallback } from "react";
import { aiApi } from "@/api/aiApi";

/**
 * File Upload Hook (Resume / AI ingestion)
 * Backend:
 * POST /api/ai/resume/screen
 */

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const uploadResume = useCallback(async (formData) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Simulated progress (Axios doesn't stream easily without config)
      const fakeProgress = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + 10));
      }, 200);

      const res = await aiApi.resumeScreen(formData);

      clearInterval(fakeProgress);
      setProgress(100);

      setResult(res.data);
      return res.data;
    } catch (err) {
      setError(err?.message || "Upload failed");
      throw err;
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  }, []);

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setResult(null);
  };

  return {
    uploadResume,
    uploading,
    progress,
    error,
    result,
    reset
  };
};