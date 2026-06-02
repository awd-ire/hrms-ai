import React, { useEffect } from "react";
import { usePerformance } from "@/hooks/usePerformance";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";

/**
 * Backend:
 * GET /api/performance/team
 */

const GoalTracker = () => {
  const {
    records,
    loading,
    error,
    teamPerformance,
  } = usePerformance();

  useEffect(() => {
    teamPerformance();
  }, [teamPerformance]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">Goal Tracker</h2>
        <button
          onClick={teamPerformance}
          className="text-sm text-blue-500"
        >
          Refresh
        </button>
      </div>

      {error && <ApiError error={{ message: error }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Employee</th>
                <th className="p-2 text-left">Score</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {records?.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center">
                    No performance data
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="p-2">{r.employee_id}</td>
                    <td className="p-2">{r.rating}</td>
                    <td className="p-2">
                      <Badge
                        label={
                          r.rating >= 4
                            ? "Excellent"
                            : r.rating >= 3
                            ? "Good"
                            : "Needs Improvement"
                        }
                        type={
                          r.rating >= 4
                            ? "success"
                            : r.rating >= 3
                            ? "warning"
                            : "danger"
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GoalTracker;
