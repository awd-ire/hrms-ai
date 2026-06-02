import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usersApi } from "@/api/usersApi";
import Button from "@/components/common/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";
import Table from "@/components/common/Table";
import StatCard from "@/components/common/StatCard";

/**
 * Admin User Management
 * Backend support currently available:
 * - GET /api/users/employee-candidates
 *
 * This screen focuses on the user accounts that can be linked to an
 * employee profile during employee onboarding.
 */
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await usersApi.employeeCandidates();
      setUsers(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) =>
      [user.username, user.email, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [users, query]);

  const roleCounts = useMemo(() => {
    return users.reduce((acc, user) => {
      const role = user.role || "unknown";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
  }, [users]);

  const columns = [
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (row) => <Badge label={row.role} type="info" />,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge label={row.is_active ? "active" : "inactive"} type={row.is_active ? "success" : "warning"} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">User Management</h1>
        <p className="text-sm text-gray-500">
          Review active user accounts that can still be linked to employee profiles.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Eligible Users" value={users.length} />
        <StatCard title="Search Results" value={filteredUsers.length} />
        <StatCard title="Roles" value={Object.keys(roleCounts).length} />
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Employee candidate accounts</h2>
            <p className="text-sm text-gray-500">
              These are active employee-role users that do not yet have an employee record.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchUsers}>
              Refresh
            </Button>
            <Link
              to="/employees"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Employee
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username, email, or role"
            className="w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
          />
          <div className="flex flex-wrap gap-2 md:justify-end">
            {Object.entries(roleCounts).length > 0 ? (
              Object.entries(roleCounts).map(([role, count]) => (
                <Badge key={role} label={`${role}: ${count}`} type="default" />
              ))
            ) : (
              <Badge label="No candidates" type="default" />
            )}
          </div>
        </div>

        {error && <ApiError error={{ message: error.message }} onRetry={fetchUsers} />}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <Table
            columns={columns}
            data={filteredUsers}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/employees"
          className="rounded-lg bg-slate-900 px-4 py-4 text-white shadow transition hover:bg-slate-800"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Next step</div>
          <div className="mt-1 text-lg font-semibold">Turn a user into an employee profile</div>
          <p className="mt-2 text-sm text-slate-300">
            Open the employee directory to create the actual employee record.
          </p>
        </Link>

        <Link
          to="/admin/departments"
          className="rounded-lg bg-emerald-600 px-4 py-4 text-white shadow transition hover:bg-emerald-700"
        >
          <div className="text-sm uppercase tracking-wide opacity-80">Related setup</div>
          <div className="mt-1 text-lg font-semibold">Keep departments ready</div>
          <p className="mt-2 text-sm text-emerald-100">
            Employee onboarding is smoother when departments are already configured.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default UserManagement;
