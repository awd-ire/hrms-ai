import React, { useEffect } from "react";
import { useLeave } from "@/hooks/useLeave";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";

/**
 * Manager Leave Approval Queue
 * Backend:
 * GET /api/leave/pending
 * PUT /api/leave/{id}/approve
 * PUT /api/leave/{id}/reject
 */
const ApprovalQueue = () => {
  const { leaves, loading, error, pending, approve, reject } = useLeave();

  useEffect(() => {
    pending();
  }, [pending]);

  const handleReject = () => {
    const reason = window.prompt("Enter rejection reason:");
    return reason;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Approval Queue</h1>
          <p className="text-sm text-gray-500">
            Review pending leave requests for your team and take action.
          </p>
        </div>

        <Button variant="secondary" onClick={pending}>
          Refresh
        </Button>
      </div>

      {error && <ApiError error={{ message: error }} onRetry={pending} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Employee</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Dates</th>
                <th className="p-2 text-left">Days</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {leaves?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    No pending requests
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="border-b dark:border-gray-700">
                    <td className="p-2 font-medium">#{leave.employee_id}</td>
                    <td className="p-2">{leave.leave_type}</td>
                    <td className="p-2">
                      {leave.start_date} to {leave.end_date}
                    </td>
                    <td className="p-2">{leave.total_days}</td>
                    <td className="p-2">{leave.reason}</td>
                    <td className="p-2">
                      <Badge
                        label={leave.status}
                        type={leave.status === "pending" ? "warning" : "default"}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button onClick={() => approve(leave.id)}>Approve</Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            const rejectionReason = handleReject();
                            if (!rejectionReason) return;
                            reject(leave.id, rejectionReason);
                          }}
                        >
                          Reject
                        </Button>
                      </div>
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

export default ApprovalQueue;
