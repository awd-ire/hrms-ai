import React, { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import EmployeeTable from "@/pages/employees/EmployeeTable";
import EmployeeForm from "@/pages/employees/EmployeeForm";
import { usePermissions } from "@/hooks/usePermissions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";

const EmployeeDirectory = () => {
  const {
    employees,
    loading,
    error,
    getAll,
    create,
    update,
    remove,
  } = useEmployees();

  const { can } = usePermissions();
  const canEdit = can(["admin", "senior_manager", "hr_recruiter"]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editorMode, setEditorMode] = useState("create");

  const openCreate = () => {
    setSelectedEmployee(null);
    setEditorMode("create");
    setEditorOpen(true);
  };

  const openEdit = (employee) => {
    setSelectedEmployee(employee);
    setEditorMode("edit");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setSelectedEmployee(null);
    setEditorMode("create");
  };

  const handleSubmit = async (payload) => {
    if (editorMode === "edit" && selectedEmployee) {
      await update(selectedEmployee.id, payload);
    } else {
      await create(payload);
    }
    closeEditor();
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Delete this employee? The record will be marked inactive."
    );

    if (!confirmed) return;

    await remove(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Employee Directory</h1>
          <p className="text-sm text-gray-500">
            View, create, update, and deactivate employee records.
          </p>
        </div>

        {canEdit && (
          <Button onClick={openCreate}>
            Add Employee
          </Button>
        )}
      </div>

      {error && <ApiError error={{ message: error }} onRetry={getAll} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <EmployeeTable
            employees={employees}
            onRefresh={getAll}
            onDelete={handleDelete}
            onEdit={openEdit}
            canEdit={canEdit}
          />

          {!canEdit && (
            <div className="mt-4 rounded-lg bg-blue-50 text-blue-800 px-4 py-3 text-sm">
              You have read-only access to the directory.
            </div>
          )}
        </>
      )}

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={editorMode === "edit" ? "Edit Employee" : "Add Employee"}
      >
        <EmployeeForm
          key={selectedEmployee?.id || "create"}
          mode={editorMode}
          initialValues={selectedEmployee}
          submitLabel={editorMode === "edit" ? "Update Employee" : "Create Employee"}
          onSubmit={handleSubmit}
          onCancel={closeEditor}
        />
      </Modal>
    </div>
  );
};

export default EmployeeDirectory;
