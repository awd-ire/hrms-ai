import React, { useEffect } from "react";
import { usePerformance } from "@/hooks/usePerformance";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";

/**
 * Backend:
 * GET /api/performance/my
 */

const MyPerformance = () => {
  const {
    records,
    loading,
    error,
    myPerformance,
    refresh
  } = usePerformance();

  useEffect(() => {
    myPerformance();
  }, [myPerformance]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Performance</h1>

      <button
        onClick={refresh}
        className="text-sm text-blue-500"
      >
        Refresh
      </button>

      {error && <ApiError error={{ message: error }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {records?.length === 0 ? (
            <p className="text-gray-500">No performance records</p>
          ) : (
            records.map((r, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
              >
                <div className="flex justify-between">
                  <h3 className="font-semibold">
                    Review #{r.id || i + 1}
                  </h3>

                  <Badge
                    label={r.score}
                    type={
                      r.score >= 4
                        ? "success"
                        : r.score >= 3
                        ? "warning"
                        : "danger"
                    }
                  />
                </div>

                <p className="text-sm text-gray-500 mt-2">
                  {r.remarks || "No remarks provided"}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MyPerformance;