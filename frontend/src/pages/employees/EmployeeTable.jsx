import React from "react";
import Table from "@/components/common/Table";
import Button from "@/components/common/Button";

const EmployeeTable = ({
  employees = [],
  onDelete,
  onEdit,
  onRefresh,
  canEdit = false,
}) => {
  const columns = [
    { key: "employee_code", label: "Code" },
    {
      key: "name",
      label: "Name",
      render: (row) => `${row.first_name} ${row.last_name}`,
    },
    { key: "email", label: "Email" },
    { key: "designation", label: "Designation" },
    { key: "department_id", label: "Department" },
    { key: "status", label: "Status" },
    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        canEdit ? (
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="secondary" onClick={() => onEdit(row)}>
                Edit
              </Button>
            )}

            {onDelete && (
              <Button variant="danger" onClick={() => onDelete(row.id)}>
                Delete
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <p className="text-sm text-gray-500">
          Manage employee records from one place.
        </p>

        <Button variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <Table columns={columns} data={employees} />
    </div>
  );
};

export default EmployeeTable;
