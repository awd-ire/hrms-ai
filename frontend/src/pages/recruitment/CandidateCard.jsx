import React from "react";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import {
  getCandidateStageBadgeType,
  getCandidateStageLabel,
  getFinalDecisionLabel,
  getShortlistDecisionLabel,
} from "@/utils/candidateStatus";

/**
 * Candidate Card
 * Backend:
 * GET /api/recruitment/candidates
 */

const CandidateCard = ({
  candidate,
  onViewDetails,
  onShortlist,
  onReject,
  actionLoading = false,
}) => {
  const canDecide = ["applied", "interview_scheduled", "interview_in_progress"].includes(candidate.stage);
  const alreadyShortlisted = candidate.shortlist_decision === "shortlisted";

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-2">
      <div className="flex justify-between">
        <h3 className="font-semibold">{candidate.full_name}</h3>

        <Badge
          label={getCandidateStageLabel(candidate.stage)}
          type={getCandidateStageBadgeType(candidate.stage)}
        />
      </div>

      <p className="text-sm text-gray-500">{candidate.email}</p>

      <div className="text-xs text-gray-400 space-y-1">
        <p>Experience: {candidate.experience_years} yrs</p>
        <p>Role: {candidate.current_role || "-"}</p>
        <p>Company: {candidate.current_company || "-"}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <p>Screening: {candidate.screening_score ?? candidate.ai_score ?? "-"}</p>
        <p>Screening Shortlist: {getShortlistDecisionLabel(candidate.shortlist_decision) || "-"}</p>
        <p>Interview: {candidate.interview_score ?? "-"}</p>
        <p>Final: {getFinalDecisionLabel(candidate.final_decision) || "-"}</p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          variant="ghost"
          className="px-3 py-1 text-xs"
          onClick={() => onViewDetails?.(candidate)}
        >
          View Details
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => onShortlist?.(candidate)}
          loading={actionLoading}
          disabled={!canDecide || alreadyShortlisted}
        >
          {alreadyShortlisted ? "Screening Shortlisted" : "Shortlist for Screening"}
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          onClick={() => onReject?.(candidate)}
          loading={actionLoading}
          disabled={!canDecide}
        >
          Reject
        </Button>
      </div>
    </div>
  );
};

export default CandidateCard;
