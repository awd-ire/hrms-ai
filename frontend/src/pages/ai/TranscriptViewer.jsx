import React from "react";

/**
 * Transcript Viewer for AI Interview System
 */

const TranscriptViewer = ({ transcript }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-2">
      <h2 className="font-semibold">Transcript</h2>

      {transcript ? (
        <div className="text-sm text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto border p-2 rounded">
          {transcript}
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          No transcript available
        </p>
      )}
    </div>
  );
};

export default TranscriptViewer;
