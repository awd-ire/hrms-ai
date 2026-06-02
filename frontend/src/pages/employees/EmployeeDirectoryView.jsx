import React, { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEmployees } from "@/hooks/useEmployees";
import EmployeeCard from "@/pages/employees/EmployeeCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

const EmployeeDirectoryView = () => {
  const { user, loading: authLoading } = useAuth();
  const scope = user?.role === "employee" ? "team" : "all";
  const { employees, loading, error, getAll } = useEmployees(scope);
  const [query, setQuery] = useState("");

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return employees;

    return employees.filter((employee) => {
      const departmentName = employee.department?.name || "";
      return [
        employee.employee_code,
        employee.first_name,
        employee.last_name,
        employee.email,
        employee.designation,
        employee.status,
        departmentName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [employees, query]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Employee Directory</h1>
        <p className="text-sm text-gray-500">
          Browse active staff across departments. This view is read-only.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div>
          <p className="text-sm text-gray-500">Total visible employees</p>
          <p className="text-2xl font-semibold">{filteredEmployees.length}</p>
        </div>

        <div className="w-full md:max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, code, email, or department"
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </div>

      {error && <ApiError error={{ message: error }} onRetry={getAll} />}

      {authLoading || loading ? (
        <LoadingSpinner />
      ) : filteredEmployees.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500">
          No employees match your search.
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectoryView;
