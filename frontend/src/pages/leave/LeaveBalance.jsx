import React, { useEffect, useState } from "react";
import { leaveApi } from "@/api/leaveApi";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Leave Balance Summary
 * Backend: GET /api/leave/balance/{id}
 */

const LeaveBalance = ({ employeeId }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalance = async () => {
    if (!employeeId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await leaveApi.balance(employeeId);
      setBalance(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [employeeId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} />;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="font-semibold mb-3">Leave Balance</h2>

      {balance && (
        <div className="grid grid-cols-3 text-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="font-bold">{balance.total}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Used</p>
            <p className="font-bold text-red-500">{balance.used}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Remaining</p>
            <p className="font-bold text-green-500">
              {balance.remaining}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;