import React from "react";
import Badge from "@/components/common/Badge";

/**
 * Resume AI Score Card
 * Backend response:
 * POST /api/ai/resume/screen
 */

const ResumeScoreCard = ({ data }) => {
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
      <div className="flex justify-between">
        <h3 className="font-semibold">AI Resume Score</h3>

        <Badge
          label={`${data.score}`}
          type={
            data.score >= 80
              ? "success"
              : data.score >= 60
              ? "warning"
              : "danger"
          }
        />
      </div>

      <p className="text-sm text-gray-600">{data.summary}</p>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <h4 className="font-semibold">Strengths</h4>
          <ul className="list-disc ml-4">
            {data.strengths?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Weaknesses</h4>
          <ul className="list-disc ml-4">
            {data.weaknesses?.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-xs">Recommendations</h4>
        <ul className="list-disc ml-4 text-xs text-gray-600">
          {data.recommendations?.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ResumeScoreCard;