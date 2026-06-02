import React, { useEffect, useState } from "react";
import { payrollApi } from "@/api/payrollApi";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import PayslipCard from "@/pages/payroll/PayslipCard";

/**
 * Employee Payslip View
 * Backend: GET /api/payroll/my
 */

const MyPayslips = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayslips = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await payrollApi.myPayroll();
      setPayslips(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Payslips</h1>

      {error && <ApiError error={{ message: error.message }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {payslips?.length === 0 ? (
            <p className="text-gray-500">No payslips available</p>
          ) : (
            payslips.map((p) => (
              <PayslipCard key={p.id} payslip={p} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MyPayslips;