import React, { useEffect } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Button from "@/components/common/Button";

/**
 * Admin/HR Payroll Table
 * Backend:
 * GET /api/payroll/employee/{id}
 * POST /api/payroll/generate
 * PUT /api/payroll/{id}/process
 */

const PayrollTable = () => {
  const {
    records,
    loading,
    error,
    myPayroll,
    generate,
    process
  } = usePayroll();

  useEffect(() => {
    myPayroll();
  }, [myPayroll]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Payroll Management</h1>

      <div className="flex gap-2">
        <Button onClick={generate}>Generate Payroll</Button>
        <Button variant="secondary" onClick={myPayroll}>
          Refresh
        </Button>
      </div>

      {error && <ApiError error={{ message: error }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Employee ID</th>
                <th className="p-2 text-left">Month</th>
                <th className="p-2 text-left">Year</th>
                <th className="p-2 text-left">Net Salary</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {records?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center">
                    No payroll records
                  </td>
                </tr>
              ) : (
                records.map((p) => (
                  <tr key={p.id} className="border-b dark:border-gray-700">
                    <td className="p-2">{p.employee_id || "-"}</td>
                    <td className="p-2">{p.payroll_month}</td>
                    <td className="p-2">{p.payroll_year}</td>
                    <td className="p-2">₹{p.net_salary}</td>
                    <td className="p-2">{p.status}</td>
                    <td className="p-2">
                      {p.status !== "processed" && (
                        <Button onClick={() => process(p.id)}>
                          Process
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PayrollTable;