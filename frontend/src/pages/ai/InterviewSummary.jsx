import React from "react";
import Badge from "@/components/common/Badge";

/**
 * Interview Summary Component
 * Backend: POST /api/ai/interview/conduct
 */

const InterviewSummary = ({ data }) => {
  if (!data) return null;

  const { evaluation, transcript } = data;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
      <h2 className="font-semibold">Interview Summary</h2>

      <div className="flex justify-between">
        <Badge
          label={`Score: ${evaluation?.score}`}
          type={
            evaluation?.score >= 80
              ? "success"
              : evaluation?.score >= 60
              ? "warning"
              : "danger"
          }
        />

        <Badge
          label={evaluation?.recommendation}
          type={
            evaluation?.recommendation === "advance"
              ? "success"
              : "warning"
          }
        />
      </div>

      <p className="text-sm text-gray-600">
        {evaluation?.summary}
      </p>

      <div>
        <h3 className="text-xs font-semibold">Transcript</h3>
        <p className="text-xs text-gray-500 max-h-32 overflow-y-auto">
          {transcript}
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Next Stage: {evaluation?.next_stage}
      </p>
    </div>
  );
};

export default InterviewSummary;