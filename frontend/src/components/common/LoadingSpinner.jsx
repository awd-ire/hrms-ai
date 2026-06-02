import React from "react";

/**
 * Global Loading Spinner
 */
const LoadingSpinner = ({ size = 6 }) => {
  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-${size} h-${size}`}
      />
    </div>
  );
};

export default LoadingSpinner;