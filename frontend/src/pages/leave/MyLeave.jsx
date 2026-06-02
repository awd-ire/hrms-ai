import React, { useEffect } from "react";
import { useLeave } from "@/hooks/useLeave";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";
import LeaveRequestForm from "@/pages/leave/LeaveRequestForm";

/**
 * Employee Leave Dashboard
 * Backend: GET /api/leave/my
 */

const MyLeave = () => {
  const { leaves, loading, error, myLeaves, refresh } = useLeave();

  useEffect(() => {
    myLeaves();
  }, [myLeaves]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Leave</h1>

      <LeaveRequestForm onSuccess={refresh} />

      {error && <ApiError error={{ message: error }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Start</th>
                <th className="p-2 text-left">End</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {leaves?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center">
                    No leave requests
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="border-b dark:border-gray-700">
                    <td className="p-2">{l.leave_type}</td>
                    <td className="p-2">{l.start_date}</td>
                    <td className="p-2">{l.end_date}</td>
                    <td className="p-2">{l.reason}</td>
                    <td className="p-2">
                      <Badge
                        label={l.status}
                        type={
                          l.status === "approved"
                            ? "success"
                            : l.status === "rejected"
                            ? "danger"
                            : "warning"
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

export default MyLeave;