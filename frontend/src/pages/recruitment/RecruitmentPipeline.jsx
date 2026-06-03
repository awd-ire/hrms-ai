import React, { useEffect, useState } from "react";
import { recruitmentApi } from "@/api/recruitmentApi";
import { useRecruitment } from "@/hooks/useRecruitment";
import CandidateCard from "@/pages/recruitment/CandidateCard";
import JobPostingForm from "@/pages/recruitment/JobPostingForm";
import CandidateDetailsModal from "@/components/recruitment/CandidateDetailsModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Recruitment Pipeline Dashboard
 * Backend:
 * GET /api/recruitment/jobs
 * GET /api/recruitment/candidates
 */

const RecruitmentPipeline = () => {
  const {
    jobs,
    candidates,
    loading,
    error,
    getJobs,
    getCandidates,
  } = useRecruitment();
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  useEffect(() => {
    getJobs();
    getCandidates();
  }, [getJobs, getCandidates]);

  const grouped = {
    applied: [],
    shortlisted: [],
    interview_scheduled: [],
    interviewed: [],
    hired: [],
    rejected: []
  };

  candidates?.forEach((c) => {
    const stage = c.stage || "applied";
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push(c);
  });

  const openCandidateDetails = async (candidate) => {
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const res = await recruitmentApi.getCandidateById(candidate.id);
      const details = res.data;
      setSelectedCandidate(details);
    } catch (err) {
      setDetailsError(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeCandidateDetails = () => {
    setSelectedCandidate(null);
    setDetailsError(null);
  };

  const handleStageChange = async (candidate, stage) => {
    setActionLoading(true);
    setDetailsError(null);

    try {
      await recruitmentApi.updateStage(candidate.id, { stage });
      await getCandidates();

      if (selectedCandidate?.id === candidate.id) {
        const updatedRes = await recruitmentApi.getCandidateById(candidate.id);
        setSelectedCandidate(updatedRes.data);
      }
    } catch (err) {
      setDetailsError(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterviewScheduled = async (candidate) => {
    await getCandidates();

    if (selectedCandidate?.id === candidate.id) {
      const updatedRes = await recruitmentApi.getCandidateById(candidate.id);
      setSelectedCandidate(updatedRes.data);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Recruitment Pipeline</h1>

      <JobPostingForm onSuccess={getJobs} />

      {error && <ApiError error={{ message: error }} />}
      {detailsError && <ApiError error={{ message: detailsError.message }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid md:grid-cols-5 gap-4">
          {Object.entries(grouped).map(([stage, list]) => (
            <div
              key={stage}
              className="bg-gray-100 dark:bg-gray-900 p-2 rounded-lg"
            >
              <h3 className="font-semibold mb-2 capitalize">
                {stage}
              </h3>

              <div className="space-y-2">
                {list.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    onViewDetails={openCandidateDetails}
                    onShortlist={(candidate) => handleStageChange(candidate, "shortlisted")}
                    onReject={(candidate) => handleStageChange(candidate, "rejected")}
                    actionLoading={actionLoading || detailsLoading}
                  />
                ))}

                {list.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No candidates
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CandidateDetailsModal
        open={Boolean(selectedCandidate)}
        candidate={selectedCandidate}
        onClose={closeCandidateDetails}
        onShortlist={(candidate) => handleStageChange(candidate, "shortlisted")}
        onReject={(candidate) => handleStageChange(candidate, "rejected")}
        onScheduleInterview={handleInterviewScheduled}
        actionLoading={actionLoading || detailsLoading}
      />
    </div>
  );
};

export default RecruitmentPipeline;
