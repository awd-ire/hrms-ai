import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "@/api/dashboardApi";
import StatCard from "@/components/common/StatCard";
import Badge from "@/components/common/Badge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Employee Dashboard
 * Backend: GET /api/dashboard/employee
 */

const EmployeeDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await dashboardApi.employee();
      setData(res.data.stats);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} />;

  const leaveBalances = data?.leave_balance?.balances || {};
  const leaveEntries = Object.entries(leaveBalances);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">My Dashboard</h1>
        <p className="text-sm text-gray-500">
          A quick view of your attendance, leave, payroll, and performance data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Attendance Records" value={data?.attendance_records ?? 0} />
        <StatCard title="Pending Leaves" value={data?.pending_leaves ?? 0} />
        <StatCard title="Approved Leaves" value={data?.approved_leaves ?? 0} />
        <StatCard title="Payslips" value={data?.recent_payroll_count ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Leave Balance</h2>
              <p className="text-sm text-gray-500">
                Remaining days by leave type for the current year.
              </p>
            </div>
            <Link
              to="/employee/leave"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Request leave
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {leaveEntries.length > 0 ? (
              leaveEntries.map(([type, balance]) => (
                <div key={type} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium capitalize">{type}</p>
                    <Badge label={`${balance.remaining} left`} type="info" />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Allowance: {balance.allowance} days
                  </p>
                  <p className="text-xs text-gray-500">
                    Used: {balance.used} days
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No leave balance data available.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow">
          <h2 className="font-semibold">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-300">
            Jump straight to the employee tools you use most often.
          </p>

          <div className="mt-4 space-y-2">
            <Link
              to="/employee/attendance"
              className="block rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              Open attendance
            </Link>
            <Link
              to="/employee/leave"
              className="block rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              Review or request leave
            </Link>
            <Link
              to="/employee/payslips"
              className="block rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              View payslips
            </Link>
            <Link
              to="/employee/performance"
              className="block rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              Check performance reviews
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
