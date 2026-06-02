import React, { useState } from "react";
import { aiApi } from "@/api/aiApi";
import InterviewChat from "@/pages/ai/InterviewChat";
import InterviewSummary from "@/pages/ai/InterviewSummary";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";
import LoadingSpinner from "@/components/common/LoadingSpinner";

/**
 * Full Interview Bot System
 * Backend:
 * - POST /api/ai/chat/interview
 * - POST /api/ai/interview/conduct
 */

const InterviewChatbot = () => {
  const [session, setSession] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const conductInterview = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.conductInterview({
        transcript: session.map((s) => s.text).join(" ")
      });

      setSummary(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">AI Interview Bot</h1>

      {error && <ApiError error={{ message: error.message }} />}

      <InterviewChat />

      <div className="flex justify-end">
        <Button onClick={conductInterview} loading={loading}>
          End Interview
        </Button>
      </div>

      {loading && <LoadingSpinner />}

      {summary && <InterviewSummary data={summary} />}
    </div>
  );
};

export default InterviewChatbot;
