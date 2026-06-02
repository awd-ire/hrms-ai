import React, { useRef, useState } from "react";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Generic File Upload Component
 * Used for resume upload (AI HRMS flow)
 */

const FileUpload = ({
  accept = ".pdf,.doc,.docx",
  maxSizeMB = 5,
  onUpload,
  label = "Upload File"
}) => {
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const validateFile = (f) => {
    if (!f) return "No file selected";

    const sizeMB = f.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `File exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    const validationError = validateFile(f);

    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setError(null);
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await onUpload(formData, (p) => setProgress(p));

      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block font-medium">{label}</label>

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="w-full border p-2 rounded"
      />

      {file && (
        <p className="text-sm text-gray-600">
          Selected: {file.name}
        </p>
      )}

      {error && <ApiError error={{ message: error }} />}

      {uploading && (
        <div className="w-full bg-gray-200 rounded h-2">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <Button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </Button>
    </div>
  );
};

export default FileUpload;
