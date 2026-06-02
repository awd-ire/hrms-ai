import React, { useState } from "react";
import { aiApi } from "@/api/aiApi";
import ResumeUpload from "@/pages/ai/ResumeUpload";
import ResumeScoreCard from "@/pages/ai/ResumeScoreCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Full AI Resume Screening Page
 * Backend: POST /api/ai/resume/screen
 */

const AIResumeScreen = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.resumeScreen(formData);
      setResult(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">AI Resume Screening</h1>

      <ResumeUpload />

      {loading && <LoadingSpinner />}

      {error && <ApiError error={{ message: error.message }} />}

      {result && <ResumeScoreCard data={result} />}
    </div>
  );
};

export default AIResumeScreen;