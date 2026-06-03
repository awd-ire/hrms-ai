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
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

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

  const updateCandidateStage = useCallback(
    async (candidate, stage) => {
      setActionLoading(true);
      setError(null);

      try {
        await recruitmentApi.updateStage(candidate.id, { stage });
        await loadCandidates();

        if (selectedCandidateDetails?.id === candidate.id) {
          await openCandidateDetails(candidate);
        }
      } catch (err) {
        setError(err);
      } finally {
        setActionLoading(false);
      }
    },
    [loadCandidates, openCandidateDetails, selectedCandidateDetails]
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

  const handleUpload = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await aiApi.resumeScreen(formData);
      setResult(res.data);
      await loadCandidates();
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
          disabled={row.stage !== "applied"}
        >
          Shortlist
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          onClick={() => updateCandidateStage(row, "rejected")}
          disabled={row.stage !== "applied"}
        >
          Reject
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">AI Resume Screening</h1>
        <p className="text-sm text-gray-500">
          Screen a fresh upload or reuse a candidate already stored in the database.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <ResumeUpload
            candidates={candidates}
            selectedCandidateId={selectedCandidateId}
            onCandidateChange={setSelectedCandidateId}
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
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
                  { key: "shortlist_decision", label: "Shortlist" },
                  { key: "final_decision", label: "Final Decision" },
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
      />
    </div>
  );
};

export default AIResumeScreen;
