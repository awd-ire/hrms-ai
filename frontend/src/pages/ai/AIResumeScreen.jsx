import React, { useCallback, useEffect, useMemo, useState } from "react";
import { aiApi } from "@/api/aiApi";
import { recruitmentApi } from "@/api/recruitmentApi";
import ResumeUpload from "@/pages/ai/ResumeUpload";
import ResumeScoreCard from "@/pages/ai/ResumeScoreCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Button from "@/components/common/Button";
import CandidateDetailsModal from "@/components/recruitment/CandidateDetailsModal";
import Table from "@/components/common/Table";
import {
  getFinalDecisionLabel,
  getShortlistDecisionLabel,
} from "@/utils/candidateStatus";

/**
 * Full AI Resume Screening Page
 * Backend:
 * POST /api/ai/resume/screen
 * GET  /api/recruitment/candidates
 */

const AIResumeScreen = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionTouched, setJobDescriptionTouched] = useState(false);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const buildCandidateJobContext = useCallback((candidate) => {
    if (!candidate?.job_posting) {
      return "";
    }

    const parts = [
      candidate.job_posting.title,
      candidate.job_posting.description,
      candidate.job_posting.requirements,
    ].filter(Boolean);

    return parts.join("\n\n");
  }, []);

  const selectedCandidate = useMemo(
    () =>
      candidates.find(
        (candidate) => String(candidate.id) === String(selectedCandidateId)
      ) || null,
    [candidates, selectedCandidateId]
  );

  const loadCandidates = useCallback(async () => {
    setPageLoading(true);
    setError(null);

    try {
      const res = await recruitmentApi.getCandidates();
      setCandidates(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setPageLoading(false);
    }
  }, []);

  const openCandidateDetails = useCallback(async (candidate) => {
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const res = await recruitmentApi.getCandidateById(candidate.id);
      setSelectedCandidateDetails(res.data);
    } catch (err) {
      setDetailsError(err);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeCandidateDetails = () => {
    setSelectedCandidateDetails(null);
    setDetailsError(null);
  };

  const handleCandidateChange = (candidateId) => {
    setSelectedCandidateId(candidateId);

    if (!candidateId) {
      return;
    }

    const candidate = candidates.find((item) => String(item.id) === String(candidateId));
    if (!candidate) {
      return;
    }

    if (!jobDescriptionTouched || !jobDescription.trim()) {
      const candidateContext = buildCandidateJobContext(candidate);
      if (candidateContext) {
        setJobDescription(candidateContext);
      }
    }
  };

  const handleJobDescriptionChange = (value) => {
    setJobDescription(value);
    setJobDescriptionTouched(true);
  };

  const handleUseCandidateContext = (candidate) => {
    const candidateContext = buildCandidateJobContext(candidate);
    if (candidateContext) {
      setJobDescription(candidateContext);
      setJobDescriptionTouched(true);
    }
  };

  const updateCandidateStage = useCallback(
    async (candidate, stage) => {
      setActionLoading(true);
      setError(null);

      try {
        const res = await recruitmentApi.updateStage(candidate.id, { stage });
        const updatedCandidate = res.data;
        setCandidates((prev) =>
          prev.map((item) =>
            String(item.id) === String(updatedCandidate.id) ? updatedCandidate : item
          )
        );
        if (String(selectedCandidateId) === String(updatedCandidate.id)) {
          setSelectedCandidateId(String(updatedCandidate.id));
        }

        if (selectedCandidateDetails?.id === candidate.id) {
          setSelectedCandidateDetails(updatedCandidate);
        }
      } catch (err) {
        setError(err);
      } finally {
        setActionLoading(false);
      }
    },
    [selectedCandidateDetails, selectedCandidateId]
  );

  const handleInterviewScheduled = useCallback(
    async (candidate) => {
      await loadCandidates();

      if (selectedCandidateDetails?.id === candidate.id) {
        await openCandidateDetails(candidate);
      }
    },
    [loadCandidates, openCandidateDetails, selectedCandidateDetails]
  );

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    const loadStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await aiApi.status();
        setAiStatus(res.data);
      } catch (err) {
        setAiStatus({
          status: "unavailable",
          message: err?.message || "Unable to load AI status",
        });
      } finally {
        setStatusLoading(false);
      }
    };

    loadStatus();
  }, []);

  const handleUpload = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await aiApi.resumeScreen(formData);
      setResult(res.data);
      await loadCandidates();

      if (
        res.data?.candidate_id &&
        selectedCandidateDetails?.id === res.data.candidate_id
      ) {
        await openCandidateDetails({ id: res.data.candidate_id });
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const candidateActionColumn = {
    key: "actions",
    label: "Actions",
    render: (row) => (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          className="px-3 py-1 text-xs"
          onClick={() => openCandidateDetails(row)}
        >
          View Details
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => updateCandidateStage(row, "shortlisted")}
          disabled={!["applied", "interview_scheduled", "interview_in_progress"].includes(row.stage)}
        >
          {row.shortlist_decision === "shortlisted"
            ? "Screening Shortlisted"
            : "Shortlist for Screening"}
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          onClick={() => updateCandidateStage(row, "rejected")}
          disabled={!["applied", "interview_scheduled", "interview_in_progress"].includes(row.stage)}
        >
          Reject
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-900 to-indigo-700 px-6 py-8 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">AI Screening Workflow</p>
        <h1 className="mt-2 text-3xl font-bold">Screen resumes, shortlist candidates, and hand off to interviews</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Pick a stored candidate or upload a new resume, add the role context, and let AI produce a score that updates the recruitment pipeline automatically.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <ResumeUpload
            candidates={candidates}
            selectedCandidateId={selectedCandidateId}
            selectedCandidate={selectedCandidate}
            onCandidateChange={handleCandidateChange}
            jobDescription={jobDescription}
            onJobDescriptionChange={handleJobDescriptionChange}
            onUseCandidateContext={handleUseCandidateContext}
            onUpload={handleUpload}
          />

          {loading && <LoadingSpinner />}

          {error && <ApiError error={{ message: error.message }} />}
          {detailsError && <ApiError error={{ message: detailsError.message }} />}

          {result && <ResumeScoreCard data={result} />}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">AI Service Status</h2>
                <p className="text-sm text-gray-500">
                  Confirm the local model is ready before screening resumes.
                </p>
              </div>
              {statusLoading ? (
                <span className="text-sm text-gray-500">Checking...</span>
              ) : (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    aiStatus?.status === "ready"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {aiStatus?.status || "unknown"}
                </span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                <p className="text-xs uppercase tracking-wide text-gray-500">Provider</p>
                <p className="mt-1 font-medium">{aiStatus?.provider || "-"}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                <p className="text-xs uppercase tracking-wide text-gray-500">Model</p>
                <p className="mt-1 font-medium">{aiStatus?.model || "-"}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              {aiStatus?.message || "Status is loading..."}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">Database Candidates</h2>
                <p className="text-sm text-gray-500">
                  {selectedCandidate
                    ? `Selected: ${selectedCandidate.full_name}`
                    : "Choose a stored candidate to screen against the uploaded resume."}
                </p>
              </div>

              <div className="text-sm text-gray-500">
                {candidates.length} records
              </div>
            </div>

            {pageLoading ? (
              <LoadingSpinner />
            ) : (
              <Table
                columns={[
                  { key: "full_name", label: "Name" },
                  { key: "stage", label: "Stage" },
                  {
                    key: "screening_score",
                    label: "Screening Score",
                    render: (row) =>
                      row.screening_score !== undefined && row.screening_score !== null
                        ? row.screening_score
                        : row.ai_score !== undefined && row.ai_score !== null
                        ? row.ai_score
                        : "-",
                  },
                  {
                    key: "shortlist_decision",
                    label: "Screening Shortlist",
                    render: (row) => getShortlistDecisionLabel(row.shortlist_decision) || "-",
                  },
                  {
                    key: "final_decision",
                    label: "Final Decision",
                    render: (row) => getFinalDecisionLabel(row.final_decision) || "-",
                  },
                  {
                    key: "email",
                    label: "Email",
                  },
                  candidateActionColumn,
                ]}
                data={candidates.slice(0, 8)}
              />
            )}
          </div>
        </div>
      </div>

      <CandidateDetailsModal
        open={Boolean(selectedCandidateDetails)}
        candidate={selectedCandidateDetails}
        onClose={closeCandidateDetails}
        onShortlist={(candidate) => updateCandidateStage(candidate, "shortlisted")}
        onReject={(candidate) => updateCandidateStage(candidate, "rejected")}
        onScheduleInterview={handleInterviewScheduled}
        actionLoading={actionLoading || detailsLoading}
        shortlistButtonLabel="Shortlist for Screening"
      />
    </div>
  );
};

export default AIResumeScreen;
