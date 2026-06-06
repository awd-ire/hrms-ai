import React from "react";

/**
 * Global Loading Spinner
 */
const LoadingSpinner = ({ size = 6 }) => {
  const pixelSize = typeof size === "number" ? size * 4 : 24;

  return (
    <div className="flex items-center justify-center p-4" role="status" aria-live="polite">
      <div
        className="animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600 dark:border-slate-600 dark:border-t-cyan-400"
        style={{ width: pixelSize, height: pixelSize }}
      />
    </div>
  );
};

export default LoadingSpinner;
