import React, { useEffect, useMemo, useState } from "react";
import { attendanceApi } from "@/api/attendanceApi";
import { employeeApi } from "@/api/employeeApi";
import { performanceApi } from "@/api/performanceApi";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";
import StatCard from "@/components/common/StatCard";
import Table from "@/components/common/Table";

/**
 * Manager Team Overview
 * Backend:
 * - GET /api/employees/my-team
 * - GET /api/attendance/team
 * - GET /api/performance/team
 */
const TeamOverview = () => {
  const [team, setTeam] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);

    try {
      const [teamRes, attendanceRes, performanceRes] = await Promise.all([
        employeeApi.myTeam(),
        attendanceApi.teamAttendance(),
        performanceApi.teamPerformance(),
      ]);

      setTeam(teamRes.data);
      setAttendance(attendanceRes.data);
      setPerformance(performanceRes.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const activeTeam = useMemo(
    () => team.filter((member) => member.is_active !== false),
    [team]
  );

  const attendanceSummary = useMemo(() => {
    return attendance.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});
  }, [attendance]);

  const averagePerformance = useMemo(() => {
    if (!performance.length) return 0;
    const total = performance.reduce((sum, item) => sum + (Number(item.rating) || 0), 0);
    return (total / performance.length).toFixed(1);
  }, [performance]);

  const columns = [
    { key: "employee_code", label: "Code" },
    {
      key: "name",
      label: "Name",
      render: (row) => `${row.first_name} ${row.last_name}`,
    },
    { key: "designation", label: "Designation" },
    {
      key: "department",
      label: "Department",
      render: (row) => row.department?.name || `#${row.department_id}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge
          label={row.status || (row.is_active ? "active" : "inactive")}
          type={row.is_active ? "success" : "warning"}
        />
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} onRetry={fetchTeam} />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Team Overview</h1>
        <p className="text-sm text-gray-500">
          View the people, attendance, and performance data for your direct team.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Team Members" value={team.length} />
        <StatCard title="Active Members" value={activeTeam.length} />
        <StatCard title="Attendance Records" value={attendance.length} />
        <StatCard title="Avg. Performance" value={averagePerformance} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <h2 className="font-semibold">Attendance Snapshot</h2>
          <p className="text-sm text-gray-500">Records collected from the team attendance feed.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3 dark:border-gray-700">
              <div className="text-sm text-gray-500">Present</div>
              <div className="mt-1 text-2xl font-semibold">{attendanceSummary.present || 0}</div>
            </div>
            <div className="rounded-lg border p-3 dark:border-gray-700">
              <div className="text-sm text-gray-500">Absent</div>
              <div className="mt-1 text-2xl font-semibold">{attendanceSummary.absent || 0}</div>
            </div>
            <div className="rounded-lg border p-3 dark:border-gray-700">
              <div className="text-sm text-gray-500">Late</div>
              <div className="mt-1 text-2xl font-semibold">{attendanceSummary.late || 0}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <h2 className="font-semibold">Performance Snapshot</h2>
          <p className="text-sm text-gray-500">Latest team review data.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3 dark:border-gray-700">
              <div className="text-sm text-gray-500">Reviews</div>
              <div className="mt-1 text-2xl font-semibold">{performance.length}</div>
            </div>
            <div className="rounded-lg border p-3 dark:border-gray-700">
              <div className="text-sm text-gray-500">Avg. Rating</div>
              <div className="mt-1 text-2xl font-semibold">{averagePerformance}</div>
            </div>
            <div className="rounded-lg border p-3 dark:border-gray-700">
              <div className="text-sm text-gray-500">Top Status</div>
              <div className="mt-1 text-2xl font-semibold">
                {performance.length ? "Available" : "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Team Members</h2>
            <p className="text-sm text-gray-500">Direct reports and their current status.</p>
          </div>
        </div>

        <div className="mt-4">
          <Table columns={columns} data={team} />
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;
