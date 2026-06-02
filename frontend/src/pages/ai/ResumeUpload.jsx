import React from "react";
import FileUpload from "@/components/common/FileUpload";

/**
 * Resume Upload (AI ingestion)
 * Backend: POST /api/ai/resume/screen
 */

const ResumeUpload = ({
  candidates = [],
  selectedCandidateId,
  onCandidateChange,
  jobDescription,
  onJobDescriptionChange,
  onUpload,
}) => {
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
                {candidate.ai_score !== undefined ? ` - AI ${candidate.ai_score}` : ""}
              </option>
            ))}
          </select>
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
        label="Upload Candidate Resume"
        accept=".pdf,.doc,.docx"
        maxSizeMB={5}
        fieldName="resume"
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
