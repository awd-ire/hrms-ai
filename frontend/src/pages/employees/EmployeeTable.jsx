import React, { useState } from "react";
import Table from "@/components/common/Table";
import Button from "@/components/common/Button";

const EmployeeTable = ({ employees = [], onDelete, onRefresh, canEdit = false }) => {
  const [selectedId, setSelectedId] = useState(null);

  const columns = [
    {
      key: "employee_code",
      label: "Code"
    },
    {
      key: "name",
      label: "Name",
      render: (row) => `${row.first_name} ${row.last_name}`
    },
    {
      key: "email",
      label: "Email"
    },
    {
      key: "designation",
      label: "Designation"
    },
    {
      key: "status",
      label: "Status"
    },
    canEdit
      ? {
          key: "actions",
          label: "Actions",
          render: (row) => (
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => onDelete(row.id)}>
                Delete
              </Button>
            </div>
          )
        }
      : {
          key: "actions",
          label: "",
          render: () => null
        }
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <Table columns={columns} data={employees} />
    </div>
  );
};

export default EmployeeTable;
