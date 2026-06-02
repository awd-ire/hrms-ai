import React, { useEffect, useMemo, useState } from "react";
import { aiApi } from "@/api/aiApi";
import { recruitmentApi } from "@/api/recruitmentApi";
import ResumeUpload from "@/pages/ai/ResumeUpload";
import ResumeScoreCard from "@/pages/ai/ResumeScoreCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
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

  const selectedCandidate = useMemo(
    () =>
      candidates.find(
        (candidate) => String(candidate.id) === String(selectedCandidateId)
      ) || null,
    [candidates, selectedCandidateId]
  );

  const loadCandidates = async () => {
    setPageLoading(true);

    try {
      const res = await recruitmentApi.getCandidates();
      setCandidates(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleUpload = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.resumeScreen(formData);
      setResult(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
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
                    key: "ai_score",
                    label: "AI Score",
                    render: (row) =>
                      row.ai_score !== undefined && row.ai_score !== null
                        ? row.ai_score
                        : "-",
                  },
                  {
                    key: "email",
                    label: "Email",
                  },
                ]}
                data={candidates.slice(0, 8)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResumeScreen;
