import React from "react";

/**
 * Enterprise Modal
 * - Overlay handling
 * - Escape UX ready (future enhancement)
 */
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center border-b pb-2 mb-3 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;