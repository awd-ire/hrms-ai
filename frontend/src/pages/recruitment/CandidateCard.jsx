import React from "react";
import Badge from "@/components/common/Badge";

/**
 * Candidate Card
 * Backend:
 * GET /api/recruitment/candidates
 */

const CandidateCard = ({ candidate }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-2">
      <div className="flex justify-between">
        <h3 className="font-semibold">{candidate.full_name}</h3>

        <Badge
          label={candidate.stage}
          type={
            candidate.stage === "hired"
              ? "success"
              : candidate.stage === "rejected"
              ? "danger"
              : "warning"
          }
        />
      </div>

      <p className="text-sm text-gray-500">{candidate.email}</p>

      <div className="text-xs text-gray-400 space-y-1">
        <p>Experience: {candidate.experience_years} yrs</p>
        <p>Role: {candidate.current_role || "-"}</p>
        <p>Company: {candidate.current_company || "-"}</p>
      </div>

      {candidate.ai_score !== undefined && (
        <div className="mt-2">
          <p className="text-xs font-semibold">
            AI Score: {candidate.ai_score}
          </p>
        </div>
      )}
    </div>
  );
};

export default CandidateCard;