import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "@/api/dashboardApi";
import { analyticsApi } from "@/api/analyticsApi";
import RoleHero from "@/components/dashboard/RoleHero";
import StatCard from "@/components/common/StatCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Admin Dashboard
 * Backend:
 * - GET /api/dashboard/admin
 * - GET /api/analytics/company
 */
const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardRes, analyticsRes] = await Promise.all([
        dashboardApi.admin(),
        analyticsApi.company(),
      ]);

      setDashboard(dashboardRes.data.stats);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const departmentBreakdown = useMemo(() => {
    const entries = Object.entries(analytics?.employees_by_department || {});
    return entries.map(([name, value]) => ({ name, value }));
  }, [analytics]);

  const statusBreakdown = useMemo(() => {
    const entries = Object.entries(analytics?.employees_by_status || {});
    return entries.map(([name, value]) => ({ name, value }));
  }, [analytics]);

  const totalEmployees = analytics?.total_employees ?? dashboard?.employees ?? 0;
  const activeEmployees = analytics?.active_employees ?? totalEmployees;
  const activeRate = totalEmployees
    ? Math.round((activeEmployees / totalEmployees) * 100)
    : 0;

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} onRetry={fetchDashboard} />;

  const chartColors = ["#2563eb", "#0f766e", "#7c3aed", "#ea580c", "#db2777", "#16a34a"];

  return (
    <div className="space-y-6">
      <RoleHero
        title="Admin Command Center"
        subtitle="Company-wide analytics, employee operations, and department control in one place."
        actions={[
          { to: "/employees", label: "Manage Employees" },
          { to: "/admin/users", label: "Review Access", variant: "soft" },
          { to: "/admin/departments", label: "Departments", variant: "soft" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Employees" value={totalEmployees} />
        <StatCard title="Active Employees" value={activeEmployees} />
        <StatCard title="Departments" value={analytics?.total_departments ?? dashboard?.departments ?? 0} />
        <StatCard title="Active Rate" value={`${activeRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Employee Distribution</h2>
              <p className="text-sm text-gray-500">
                Breakdown of employees by department.
              </p>
            </div>
            <Link
              to="/analytics/company"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Open analytics
            </Link>
          </div>

          <div className="mt-4 h-80">
            {departmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No department analytics available yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <div>
            <h2 className="font-semibold">Employee Status</h2>
            <p className="text-sm text-gray-500">
              Active, inactive, and other recorded statuses.
            </p>
          </div>

          <div className="mt-4 h-80">
            {statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No employee status analytics available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/employees"
          className="rounded-lg bg-blue-600 px-4 py-4 text-white shadow transition hover:bg-blue-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Employee Ops</div>
          <div className="mt-1 text-lg font-semibold">Manage staff records</div>
          <p className="mt-2 text-sm text-blue-100">
            Create, update, and deactivate employee records.
          </p>
        </Link>

        <Link
          to="/admin/users"
          className="rounded-lg bg-violet-600 px-4 py-4 text-white shadow transition hover:bg-violet-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">User Access</div>
          <div className="mt-1 text-lg font-semibold">Review employee-linked users</div>
          <p className="mt-2 text-sm text-violet-100">
            See active employee accounts that are ready to be turned into employee profiles.
          </p>
        </Link>

        <Link
          to="/admin/departments"
          className="rounded-lg bg-emerald-600 px-4 py-4 text-white shadow transition hover:bg-emerald-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Departments</div>
          <div className="mt-1 text-lg font-semibold">Manage department master data</div>
          <p className="mt-2 text-sm text-emerald-100">
            Add, update, or remove departments from the company structure.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
