import React from "react";

/**
 * API Error Display Component
 */
const ApiError = ({ error, onRetry }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
      <p className="text-sm">{error?.message || "Something went wrong"}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm underline text-red-600"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ApiError;