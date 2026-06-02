import React from "react";

/**
 * Dashboard Stat Card
 */
const StatCard = ({ title, value, icon, trend }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
          {value}
        </h3>
        {trend && (
          <p className="text-xs text-green-600">{trend}</p>
        )}
      </div>

      <div className="text-2xl text-blue-600">{icon}</div>
    </div>
  );
};

export default StatCard;