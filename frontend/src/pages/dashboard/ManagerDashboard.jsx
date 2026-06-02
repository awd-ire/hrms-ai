import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "@/api/dashboardApi";
import StatCard from "@/components/common/StatCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";

/**
 * Manager Dashboard
 * Backend: GET /api/dashboard/manager
 */
const ManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await dashboardApi.manager();
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

  const attendance = data?.attendance_analytics || {};
  const performance = data?.performance_analytics || {};

  const attendanceBreakdown = useMemo(
    () => [
      { label: "Present", value: attendance.present_count ?? 0 },
      { label: "Absent", value: attendance.absent_count ?? 0 },
      { label: "Late", value: attendance.late_count ?? 0 },
    ],
    [attendance]
  );

  const performanceBreakdown = useMemo(
    () => [
      { label: "Total Reviews", value: performance.total_reviews ?? 0 },
      { label: "Avg Rating", value: performance.average_rating ?? 0 },
      { label: "Pending Approvals", value: data?.pending_approvals ?? 0 },
    ],
    [performance, data]
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} onRetry={fetchDashboard} />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Manager Dashboard</h1>
        <p className="text-sm text-gray-500">
          Team approvals, attendance insights, and performance tracking for your direct reports.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Team Size" value={data?.team_size ?? 0} />
        <StatCard title="Pending Approvals" value={data?.pending_approvals ?? 0} />
        <StatCard title="Attendance Records" value={attendance.total_records ?? 0} />
        <StatCard title="Avg Rating" value={performance.average_rating ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Attendance Overview</h2>
              <p className="text-sm text-gray-500">
                Team attendance metrics from the backend analytics feed.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {attendanceBreakdown.map((item) => (
              <div key={item.label} className="rounded-lg border p-3 dark:border-gray-700">
                <div className="text-sm text-gray-500">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div>
            <h2 className="font-semibold">Performance Overview</h2>
            <p className="text-sm text-gray-500">
              Track the latest team review metrics.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {performanceBreakdown.map((item) => (
              <div key={item.label} className="rounded-lg border p-3 dark:border-gray-700">
                <div className="text-sm text-gray-500">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          to="/manager/approvals"
          className="rounded-lg bg-blue-600 px-4 py-4 text-white shadow transition hover:bg-blue-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Approvals</div>
          <div className="mt-1 text-lg font-semibold">Review leave requests</div>
          <p className="mt-2 text-sm text-blue-100">
            Approve or reject pending team leave requests.
          </p>
        </Link>

        <Link
          to="/manager/team"
          className="rounded-lg bg-emerald-600 px-4 py-4 text-white shadow transition hover:bg-emerald-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Team</div>
          <div className="mt-1 text-lg font-semibold">Open team overview</div>
          <p className="mt-2 text-sm text-emerald-100">
            Review direct reports, attendance, and performance.
          </p>
        </Link>

        <Link
          to="/manager/performance"
          className="rounded-lg bg-slate-900 px-4 py-4 text-white shadow transition hover:bg-slate-800"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Performance</div>
          <div className="mt-1 text-lg font-semibold">See goal tracker</div>
          <p className="mt-2 text-sm text-slate-300">
            Check the team performance records and ratings.
          </p>
        </Link>

        <Link
          to="/manager/attendance"
          className="rounded-lg bg-violet-600 px-4 py-4 text-white shadow transition hover:bg-violet-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Attendance</div>
          <div className="mt-1 text-lg font-semibold">Attendance analytics</div>
          <p className="mt-2 text-sm text-violet-100">
            Review the team attendance breakdown.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default ManagerDashboard;
