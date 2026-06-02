import React, { useEffect, useMemo, useState } from "react";
import { analyticsApi } from "@/api/analyticsApi";
import { attendanceApi } from "@/api/attendanceApi";
import { dashboardApi } from "@/api/dashboardApi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import StatCard from "@/components/common/StatCard";

/**
 * Admin Analytics Dashboard
 * Aggregates:
 * - GET /api/analytics/company
 * - GET /api/analytics/attendance
 * - GET /api/analytics/recruitment
 * - GET /api/dashboard/admin
 */
const AttendanceAnalytics = () => {
  const [company, setCompany] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [recruitment, setRecruitment] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const [companyRes, attendanceRes, recruitmentRes, dashboardRes] =
        await Promise.all([
          analyticsApi.company(),
          attendanceApi.analytics(),
          analyticsApi.recruitment(),
          dashboardApi.admin(),
        ]);

      setCompany(companyRes.data);
      setAttendance(attendanceRes.data);
      setRecruitment(recruitmentRes.data);
      setDashboard(dashboardRes.data.stats);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const departmentData = useMemo(() => {
    return Object.entries(company?.employees_by_department || {}).map(
      ([name, value]) => ({ name, value })
    );
  }, [company]);

  const companyStatusData = useMemo(() => {
    return Object.entries(company?.employees_by_status || {}).map(
      ([name, value]) => ({ name, value })
    );
  }, [company]);

  const attendanceStatusData = useMemo(() => {
    return Object.entries(attendance?.by_status || {}).map(([name, value]) => ({
      name,
      value,
    }));
  }, [attendance]);

  const recruitmentStatusData = useMemo(() => {
    return Object.entries(recruitment?.candidates_by_stage || {}).map(
      ([name, value]) => ({ name, value })
    );
  }, [recruitment]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} onRetry={fetchAnalytics} />;

  const colors = ["#2563eb", "#0f766e", "#7c3aed", "#ea580c", "#db2777", "#16a34a"];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-gray-500">
          Company health, attendance trends, and recruitment pipeline in one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Employees" value={company?.total_employees ?? dashboard?.employees ?? 0} />
        <StatCard title="Active Employees" value={company?.active_employees ?? 0} />
        <StatCard title="Open Jobs" value={recruitment?.open_jobs ?? dashboard?.open_jobs ?? 0} />
        <StatCard title="Attendance Records" value={attendance?.total_records ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Employees by Department</h2>
              <p className="text-sm text-gray-500">Current company distribution.</p>
            </div>
          </div>

          <div className="mt-4 h-80">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No department analytics available.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <div>
            <h2 className="font-semibold">Employee Status</h2>
            <p className="text-sm text-gray-500">Active and inactive employee counts.</p>
          </div>

          <div className="mt-4 h-80">
            {companyStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={companyStatusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {companyStatusData.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No employee status analytics available.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <div>
            <h2 className="font-semibold">Attendance Status</h2>
            <p className="text-sm text-gray-500">Attendance records by status.</p>
          </div>

          <div className="mt-4 h-80">
            {attendanceStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No attendance analytics available.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <div>
            <h2 className="font-semibold">Recruitment Pipeline</h2>
            <p className="text-sm text-gray-500">Candidates by stage.</p>
          </div>

          <div className="mt-4 h-80">
            {recruitmentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={recruitmentStatusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {recruitmentStatusData.map((entry, index) => (
                      <Cell key={entry.name} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No recruitment analytics available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceAnalytics;
