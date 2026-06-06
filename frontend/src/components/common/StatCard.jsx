import React from "react";

/**
 * Dashboard Stat Card
 */
const StatCard = ({ title, value, icon, trend, className = "", valueClassName = "", iconClassName = "" }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center justify-between ${className}`}>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className={`text-xl font-bold text-slate-700 dark:text-white ${valueClassName}`}>
          {value}
        </h3>
        {trend && (
          <p className="text-xs text-green-600">{trend}</p>
        )}
      </div>

      <div className={`text-2xl text-blue-600 ${iconClassName}`}>{icon}</div>
    </div>
  );
};

export default StatCard;
