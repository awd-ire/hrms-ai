import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "@/api/dashboardApi";
import { employeeApi } from "@/api/employeeApi";
import StatCard from "@/components/common/StatCard";
import Table from "@/components/common/Table";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * HR Dashboard
 * Backend: GET /api/dashboard/hr
 */

const HRDashboard = () => {
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardRes, employeesRes] = await Promise.all([
        dashboardApi.hr(),
        employeeApi.getAll(),
      ]);

      setData(dashboardRes.data.stats);
      setEmployees(employeesRes.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const recentEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active).slice(0, 5),
    [employees]
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} />;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">HR Dashboard</h1>
        <p className="text-sm text-gray-500">
          Live HR metrics pulled from the database and recent employee records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Open Jobs" value={data?.recruitment?.open_jobs ?? 0} />
        <StatCard title="Candidates" value={data?.recruitment?.total_candidates ?? 0} />
        <StatCard title="Interviews" value={data?.recruitment?.interviews_scheduled ?? 0} />
        <StatCard
          title="Pending Interview Reviews"
          value={data?.recruitment?.pending_interview_reviews ?? 0}
        />
        <StatCard title="Pending Leaves" value={data?.pending_leaves ?? 0} />
        <StatCard title="Active Employees" value={data?.employees ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/employees"
          className="rounded-lg bg-blue-600 px-4 py-4 text-white shadow transition hover:bg-blue-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Employee Ops</div>
          <div className="mt-1 text-lg font-semibold">Add or update employees</div>
          <p className="mt-2 text-sm text-blue-100">
            Open the employee directory to create a new record or edit an existing one.
          </p>
        </Link>

        <Link
          to="/hr/recruitment"
          className="rounded-lg bg-emerald-600 px-4 py-4 text-white shadow transition hover:bg-emerald-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Recruitment</div>
          <div className="mt-1 text-lg font-semibold">Create job postings</div>
          <p className="mt-2 text-sm text-emerald-100">
            Jump to the recruitment pipeline and publish a new role right away.
          </p>
        </Link>

        <Link
          to="/hr/resume-screen"
          className="rounded-lg bg-slate-800 px-4 py-4 text-white shadow transition hover:bg-slate-900"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">AI Screening</div>
          <div className="mt-1 text-lg font-semibold">Screen candidate resumes</div>
          <p className="mt-2 text-sm text-slate-200">
            Review stored candidates and run AI screening from the dashboard.
          </p>
        </Link>

        <Link
          to="/hr/interview"
          className="rounded-lg bg-violet-600 px-4 py-4 text-white shadow transition hover:bg-violet-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Interview Desk</div>
          <div className="mt-1 text-lg font-semibold">Schedule and run interviews</div>
          <p className="mt-2 text-sm text-violet-100">
            Open the dedicated interview workspace to set dates and process candidate answers.
          </p>
        </Link>

        <Link
          to="/hr/candidate-portal"
          className="rounded-lg bg-indigo-600 px-4 py-4 text-white shadow transition hover:bg-indigo-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">AI Interview</div>
          <div className="mt-1 text-lg font-semibold">Candidate portal and result flow</div>
          <p className="mt-2 text-sm text-indigo-100">
            Open the public candidate page where applicants can apply, take the interview,
            and view their screening result.
          </p>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Recent Employees</h2>
            <p className="text-sm text-gray-500">
              Latest active records returned from the employee database.
            </p>
          </div>

          <div className="text-sm text-gray-500">
            Showing {recentEmployees.length} active records
          </div>
        </div>

        <Table
          columns={[
            { key: "employee_code", label: "Code" },
            {
              key: "name",
              label: "Name",
              render: (row) => `${row.first_name} ${row.last_name}`,
            },
            { key: "email", label: "Email" },
            {
              key: "department",
              label: "Department",
              render: (row) => row.department?.name || `#${row.department_id}`,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => row.status || (row.is_active ? "active" : "inactive"),
            },
          ]}
          data={recentEmployees}
        />
      </div>
    </div>
  );
};

export default HRDashboard;
