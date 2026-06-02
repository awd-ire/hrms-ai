import React, { useState } from "react";
import FileUpload from "@/components/common/FileUpload";
import { useFileUpload } from "@/hooks/useFileUpload";
import ApiError from "@/components/common/ApiError";

/**
 * Resume Upload (AI ingestion)
 * Backend: POST /api/ai/resume/screen
 */

const ResumeUpload = () => {
  const { uploadResume, uploading, progress, error, result } =
    useFileUpload();

  const handleUpload = async (formData) => {
    await uploadResume(formData);
  };

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="font-semibold text-lg">Upload Resume</h2>

      <FileUpload
        label="Upload Candidate Resume"
        accept=".pdf,.doc,.docx"
        maxSizeMB={5}
        onUpload={handleUpload}
      />

      {uploading && (
        <div className="space-y-1">
          <p className="text-sm text-gray-500">
            Uploading... {progress}%
          </p>

          <div className="w-full bg-gray-200 rounded h-2">
            <div
              className="bg-blue-500 h-2 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && <ApiError error={{ message: error }} />}

      {result && (
        <div className="text-sm text-green-600">
          Resume processed successfully
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;