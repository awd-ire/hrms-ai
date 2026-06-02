import React, { createContext, useCallback, useContext, useState } from "react";

/**
 * Notification Context
 * Supports: success, error, warning, info
 */

const NotificationContext = createContext(null);

let idCounter = 0;

const createNotification = (type, message, duration = 3000) => ({
  id: ++idCounter,
  type,
  message,
  duration
});

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((type, message, duration) => {
    const notification = createNotification(type, message, duration);

    setNotifications((prev) => [...prev, notification]);

    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }, [removeNotification]);

  const success = useCallback(
    (message, duration) => addNotification("success", message, duration),
    [addNotification]
  );

  const error = useCallback(
    (message, duration) => addNotification("error", message, duration),
    [addNotification]
  );

  const warning = useCallback(
    (message, duration) => addNotification("warning", message, duration),
    [addNotification]
  );

  const info = useCallback(
    (message, duration) => addNotification("info", message, duration),
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        removeNotification,
        success,
        error,
        warning,
        info
      }}
    >
      {children}

      {/* Notification UI Layer */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-4 py-2 rounded shadow text-white text-sm
              ${
                n.type === "success"
                  ? "bg-green-500"
                  : n.type === "error"
                  ? "bg-red-500"
                  : n.type === "warning"
                  ? "bg-yellow-500"
                  : "bg-blue-500"
              }`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotification must be used within NotificationProvider"
    );
  }

  return context;
};

export default NotificationContext;
