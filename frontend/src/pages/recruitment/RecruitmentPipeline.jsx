import React, { useEffect } from "react";
import { useRecruitment } from "@/hooks/useRecruitment";
import CandidateCard from "@/pages/recruitment/CandidateCard";
import JobPostingForm from "@/pages/recruitment/JobPostingForm";
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
    getCandidates
  } = useRecruitment();

  useEffect(() => {
    getJobs();
    getCandidates();
  }, [getJobs, getCandidates]);

  const grouped = {
    applied: [],
    screening: [],
    interview: [],
    hired: [],
    rejected: []
  };

  candidates?.forEach((c) => {
    const stage = c.stage || "applied";
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push(c);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Recruitment Pipeline</h1>

      <JobPostingForm onSuccess={getJobs} />

      {error && <ApiError error={{ message: error }} />}

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
                  <CandidateCard key={c.id} candidate={c} />
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
    </div>
  );
};

export default RecruitmentPipeline;
