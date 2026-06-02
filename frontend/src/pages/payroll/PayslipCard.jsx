import React from "react";
import Badge from "@/components/common/Badge";

/**
 * Single Payslip Card
 * Used in employee dashboard
 * Backend: GET /api/payroll/{id}/payslip
 */

const PayslipCard = ({ payslip }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border space-y-2">
      <div className="flex justify-between">
        <h3 className="font-semibold">
          Payslip - {payslip.payroll_month} {payslip.payroll_year}
        </h3>

        <Badge
          label={payslip.status}
          type={payslip.status === "paid" ? "success" : "warning"}
        />
      </div>

      <div className="text-sm space-y-1">
        <p>
          <span className="text-gray-500">Net Salary:</span>{" "}
          <span className="font-bold">₹{payslip.net_salary}</span>
        </p>

        <p>
          <span className="text-gray-500">Payroll ID:</span>{" "}
          {payslip.id}
        </p>
      </div>
    </div>
  );
};

export default PayslipCard;