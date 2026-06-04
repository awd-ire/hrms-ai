import React, { useEffect, useState } from "react";
import Modal from "@/components/common/Modal";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { recruitmentApi } from "@/api/recruitmentApi";
import {
  getCandidateStageBadgeType,
  getCandidateStageLabel,
  getFinalDecisionLabel,
  getShortlistDecisionLabel,
} from "@/utils/candidateStatus";

const CandidateDetailsModal = ({
  open,
  candidate,
  onClose,
  onShortlist,
  onReject,
  onScheduleInterview,
  actionLoading = false,
  shortlistButtonLabel = "Final Select Candidate",
}) => {
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    interview_round: "phone",
    scheduled_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!open) {
      setScheduling(false);
      setScheduleError(null);
      setScheduleForm({
        interview_round: "phone",
        scheduled_date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open]);

  if (!candidate) return null;

  const interviewCount = candidate.interviews?.length || 0;
  const latestInterview = [...(candidate.interviews || [])]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null;
  const canDecide = ["applied", "interview_scheduled", "interview_in_progress"].includes(candidate.stage);
  const canSchedule = candidate.stage === "shortlisted";
  const alreadyShortlisted = candidate.shortlist_decision === "shortlisted";
  const latestTranscript = latestInterview?.transcript || "";

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    setScheduleError(null);
    setScheduling(true);

    try {
      const res = await recruitmentApi.createInterview({
        candidate_id: candidate.id,
        interview_round: scheduleForm.interview_round,
        scheduled_date: scheduleForm.scheduled_date,
        status: "scheduled",
      });

      await onScheduleInterview?.(candidate, res.data);
    } catch (err) {
      setScheduleError(err?.message || "Failed to schedule interview");
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Candidate Details: ${candidate.full_name}`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={getCandidateStageLabel(candidate.stage)} type={getCandidateStageBadgeType(candidate.stage)} />
          {candidate.shortlist_decision && (
            <Badge
              label={
                candidate.shortlist_decision === "shortlisted"
                  ? "Shortlisted - Final selected"
                  : getShortlistDecisionLabel(candidate.shortlist_decision)
              }
              type={candidate.shortlist_decision === "shortlisted" ? "success" : "danger"}
            />
          )}
          {candidate.final_decision && (
            <Badge
              label={getFinalDecisionLabel(candidate.final_decision)}
              type={candidate.final_decision === "hired" ? "success" : "danger"}
            />
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
            <p className="font-medium">{candidate.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
            <p className="font-medium">{candidate.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Applied Date</p>
            <p className="font-medium">{candidate.applied_date || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Job Posting</p>
            <p className="font-medium">
              {candidate.job_posting?.title || `#${candidate.job_posting_id}`}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Experience</p>
            <p className="font-medium">{candidate.experience_years ?? 0} years</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Current Role</p>
            <p className="font-medium">{candidate.current_role || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Current Company</p>
            <p className="font-medium">{candidate.current_company || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Interviews</p>
            <p className="font-medium">{interviewCount}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500">Screening Score</p>
            <p className="mt-1 text-lg font-semibold">
              {candidate.screening_score ?? candidate.ai_score ?? "-"}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {candidate.screening_summary || candidate.ai_summary || "No screening summary available."}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500">Interview Score</p>
            <p className="mt-1 text-lg font-semibold">
              {candidate.interview_score ?? "-"}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {candidate.interview_summary || "No interview summary available."}
            </p>
          </div>
        </div>

        {latestInterview && (
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-500">Latest Interview</p>
            <p className="mt-1 text-sm font-medium">
              {latestInterview.interview_round} on {latestInterview.scheduled_date}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Status: {latestInterview.status} | Recommendation: {latestInterview.recommendation || "-"}
            </p>
            <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900">
              <p className="text-xs uppercase tracking-wide text-gray-500">Transcript</p>
              <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                {latestTranscript || "No transcript available yet."}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => onShortlist?.(candidate)}
            loading={actionLoading}
            disabled={!canDecide || alreadyShortlisted}
          >
            {alreadyShortlisted ? "Shortlisted - Final selected" : shortlistButtonLabel}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onReject?.(candidate)}
            loading={actionLoading}
            disabled={!canDecide}
          >
            Reject Candidate
          </Button>
        </div>

        {canSchedule && (
          <form className="space-y-3 rounded-lg border border-dashed p-4" onSubmit={handleScheduleInterview}>
          <div>
            <p className="text-sm font-semibold">Next step: schedule interview</p>
            <p className="text-xs text-gray-500">
                After this selection, set the interview round and date so the candidate can see it in the portal.
            </p>
          </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Interview round</span>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={scheduleForm.interview_round}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, interview_round: e.target.value })
                  }
                >
                  <option value="phone">Phone</option>
                  <option value="technical">Technical</option>
                  <option value="hr">HR</option>
                  <option value="final">Final</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Scheduled date</span>
                <input
                  className="w-full rounded border px-3 py-2"
                  type="date"
                  value={scheduleForm.scheduled_date}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })
                  }
                  required
                />
              </label>
            </div>

            {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={scheduling || actionLoading}>
                Schedule Interview
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CandidateDetailsModal;
