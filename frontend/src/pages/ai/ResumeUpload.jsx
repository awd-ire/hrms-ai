import React from "react";
import FileUpload from "@/components/common/FileUpload";

/**
 * Resume Upload (AI ingestion)
 * Backend: POST /api/ai/resume/screen
 */

const ResumeUpload = ({
  candidates = [],
  selectedCandidateId,
  selectedCandidate = null,
  onCandidateChange,
  jobDescription,
  onJobDescriptionChange,
  onUseCandidateContext,
  onUpload,
}) => {
  const useStoredCandidate = Boolean(selectedCandidateId);

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">Screen a Resume</h2>
        <p className="text-sm text-gray-500">
          Upload a new resume or choose a stored candidate record from the database.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Database Candidate
          </label>

          <select
            value={selectedCandidateId ?? ""}
            onChange={(e) => onCandidateChange?.(e.target.value || "")}
            className="w-full border p-2 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Screen uploaded resume</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.full_name}
                {candidate.job_posting?.title ? ` - ${candidate.job_posting.title}` : ""}
                {candidate.screening_score !== undefined && candidate.screening_score !== null
                  ? ` - Screening ${candidate.screening_score}`
                  : candidate.ai_score !== undefined && candidate.ai_score !== null
                  ? ` - AI ${candidate.ai_score}`
                  : ""}
              </option>
            ))}
          </select>

          {selectedCandidate && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
              <p className="font-semibold">{selectedCandidate.full_name}</p>
              <p className="mt-1 text-xs uppercase tracking-wide opacity-80">
                {selectedCandidate.job_posting?.title || "Stored candidate"}
              </p>
              <p className="mt-2 text-sm opacity-90">
                {selectedCandidate.job_posting?.description || "Using the candidate's saved resume and profile context."}
              </p>
              <button
                type="button"
                className="mt-3 rounded-md border border-blue-300 px-3 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-100 dark:hover:bg-blue-900"
                onClick={() => onUseCandidateContext?.(selectedCandidate)}
              >
                Use candidate job context
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Job Description
          </label>

          <textarea
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange?.(e.target.value)}
            placeholder="Optional job description for a better screening match"
            rows={4}
            className="w-full border p-2 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </div>

      <FileUpload
        label={useStoredCandidate ? "Screen Stored Candidate" : "Upload Candidate Resume"}
        accept=".pdf,.doc,.docx"
        maxSizeMB={5}
        fieldName="resume"
        requireFile={!useStoredCandidate}
        hideInput={useStoredCandidate}
        helperText={
          useStoredCandidate
            ? "The stored resume will be analyzed. Clear the selection to upload a new file instead."
            : "Upload a new resume file or switch to a stored candidate."
        }
        additionalFields={{
          candidate_id: selectedCandidateId || undefined,
          job_description: jobDescription || undefined,
        }}
        onUpload={onUpload}
      />
    </div>
  );
};

export default ResumeUpload;
