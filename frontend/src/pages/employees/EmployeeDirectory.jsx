import React, { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { useEmployees } from "@/hooks/useEmployees";
import EmployeeTable from "@/pages/employees/EmployeeTable";
import EmployeeForm from "@/pages/employees/EmployeeForm";
import { usePermissions } from "@/hooks/usePermissions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Button from "@/components/common/Button";

const EmployeeDirectory = () => {
  const {
    employees,
    loading,
    error,
    getAll,
    create,
    update,
    remove
  } = useEmployees();

  const { role, can } = usePermissions();
  const canEdit = can(["admin", "senior_manager", "hr_recruiter"]);

  useEffect(() => {
    getAll();
  }, [getAll]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Employee Directory</h1>
        </div>

        {error && <ApiError error={{ message: error }} />}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <EmployeeTable
              employees={employees}
              onRefresh={getAll}
              onDelete={remove}
              canEdit={canEdit}
            />

            {!canEdit && (
              <div className="mt-4 text-sm text-gray-600">
                You have read-only access to the directory. Contact an administrator to manage employee records.
              </div>
            )}

            {canEdit && (
              <div className="mt-6">
                <EmployeeForm onCreate={create} onUpdate={update} />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default EmployeeDirectory;