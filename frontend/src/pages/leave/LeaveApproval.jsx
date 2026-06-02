import React, { useEffect } from "react";
import { useLeave } from "@/hooks/useLeave";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";

/**
 * Leave Approval Panel (Manager/HR)
 * Backend:
 * GET /api/leave/pending
 * PUT /api/leave/{id}/approve
 * PUT /api/leave/{id}/reject
 */

const LeaveApproval = () => {
  const {
    leaves,
    loading,
    error,
    pending,
    approve,
    reject,
    refresh
  } = useLeave();

  useEffect(() => {
    pending();
  }, [pending]);

  const handleReject = (leaveId) => {
    const rejectionReason = window.prompt("Enter rejection reason:");
    if (!rejectionReason) return;
    reject(leaveId, rejectionReason);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Leave Approvals</h1>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={refresh}>
          Refresh
        </Button>
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
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Dates</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {leaves?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center">
                    No pending requests
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="border-b dark:border-gray-700">
                    <td className="p-2">{l.employee_id}</td>
                    <td className="p-2">{l.leave_type}</td>
                    <td className="p-2">
                      {l.start_date} → {l.end_date}
                    </td>
                    <td className="p-2">{l.reason}</td>

                    <td className="p-2">
                      <Badge label={l.status} type="warning" />
                    </td>

                    <td className="p-2 flex gap-2">
                      <Button
                        onClick={() => approve(l.id)}
                      >
                        Approve
                      </Button>

                      <Button variant="danger" onClick={() => handleReject(l.id)}>
                        Reject
                      </Button>
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

export default LeaveApproval;
