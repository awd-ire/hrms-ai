import { useCallback, useState } from "react";
import { payrollApi } from "@/api/payrollApi";

export const usePayroll = () => {
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => setError(err?.message || "Payroll error");

  const myPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await payrollApi.myPayroll();
      setRecords(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const employeePayroll = useCallback(async (id) => {
    try {
      const res = await payrollApi.getEmployeePayroll(id);
      setRecords(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  }, []);

  const generate = useCallback(async () => {
    try {
      await payrollApi.generate();
      await myPayroll();
    } catch (err) {
      handleError(err);
    }
  }, [myPayroll]);

  const process = useCallback(async (id) => {
    try {
      await payrollApi.process(id);
      await myPayroll();
    } catch (err) {
      handleError(err);
    }
  }, [myPayroll]);

  const analyticsData = useCallback(async () => {
    try {
      const res = await payrollApi.analytics();
      setAnalytics(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  }, []);

  return {
    records,
    analytics,
    loading,
    error,
    myPayroll,
    employeePayroll,
    generate,
    process,
    analyticsData,
    refresh: myPayroll
  };
};
