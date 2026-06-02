import React from "react";
import Badge from "@/components/common/Badge";

const EmployeeCard = ({ employee }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white">
            {employee.first_name} {employee.last_name}
          </h3>

          <p className="text-sm text-gray-500">
            {employee.designation}
          </p>

          <p className="text-xs text-gray-400">
            {employee.email}
          </p>
        </div>

        <Badge
          label={employee.status}
          type={employee.status === "active" ? "success" : "warning"}
        />
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <p>Code: {employee.employee_code}</p>
        <p>Department ID: {employee.department_id}</p>
      </div>
    </div>
  );
};

export default EmployeeCard;