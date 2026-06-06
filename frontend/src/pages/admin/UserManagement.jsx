import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usersApi } from "@/api/usersApi";
import Button from "@/components/common/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";
import Table from "@/components/common/Table";
import StatCard from "@/components/common/StatCard";
import Modal from "@/components/common/Modal";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Admin User Management
 * Backend support currently available:
 * - GET /api/users/employee-candidates
 *
 * This screen focuses on the user accounts that can be linked to an
 * employee profile during employee onboarding.
 */
const UserManagement = () => {
  const { role } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "employee",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const allowedRoles = useMemo(() => {
    if (role === "admin") {
      return ["admin", "senior_manager", "hr_recruiter", "employee"];
    }

    if (role === "senior_manager") {
      return ["hr_recruiter", "employee"];
    }

    return ["employee"];
  }, [role]);

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

  useEffect(() => {
    setCreateForm((current) => ({
      ...current,
      role: allowedRoles.includes(current.role) ? current.role : allowedRoles[0] || "employee",
    }));
  }, [allowedRoles]);

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

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      if (!allowedRoles.includes(createForm.role)) {
        throw new Error("You are not allowed to create that role.");
      }

      await usersApi.create(createForm);
      setCreateSuccess(`Created ${createForm.role} account for ${createForm.username}.`);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        role: allowedRoles[0] || "employee",
      });
      fetchUsers();
      setOnboardingOpen(false);
    } catch (err) {
      setCreateError(err?.response?.data?.detail || err?.message || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  };

  const openOnboarding = () => {
    setCreateError("");
    setCreateSuccess("");
    setCreateForm((current) => ({
      ...current,
      role: allowedRoles.includes(current.role) ? current.role : allowedRoles[0] || "employee",
    }));
    setOnboardingOpen(true);
  };

  const closeOnboarding = () => {
    if (createLoading) return;
    setOnboardingOpen(false);
    setCreateError("");
  };

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
          Admin, manager, and HR can create login accounts here with role limits based on their hierarchy.
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
            <Button onClick={openOnboarding}>
              Start Onboarding
            </Button>
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

      <Modal
        open={onboardingOpen}
        onClose={closeOnboarding}
        title="Create Login Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100">
              {role === "admin"
                ? "Admin can create admin, manager, HR, and employee accounts."
                : role === "senior_manager"
                ? "Manager can create HR and employee accounts."
                : "HR can create employee accounts."}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Username
              </label>
              <input
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="Username"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Password
              </label>
              <input
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Password"
                type="password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Role
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                required
              >
                {allowedRoles.map((allowedRole) => (
                  <option key={allowedRole} value={allowedRole}>
                    {allowedRole}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {createError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
              {createError}
            </p>
          )}
          {createSuccess && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
              {createSuccess}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeOnboarding} disabled={createLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={createLoading}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
