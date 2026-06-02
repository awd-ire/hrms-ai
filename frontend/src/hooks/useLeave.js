import { useCallback, useState } from "react";
import { leaveApi } from "@/api/leaveApi";

export const useLeave = () => {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => setError(err?.message || "Leave error");

  const myLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await leaveApi.myLeaves();
      setLeaves(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const pending = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await leaveApi.pending();
      setLeaves(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getBalance = useCallback(async (id) => {
    try {
      const res = await leaveApi.balance(id);
      setBalance(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  }, []);

  const requestLeave = useCallback(async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await leaveApi.request(payload);
      await myLeaves();
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [myLeaves]);

  const approve = useCallback(async (id) => {
    try {
      await leaveApi.approve(id);
      await pending();
    } catch (err) {
      handleError(err);
    }
  }, [pending]);

  const reject = useCallback(async (id, rejectionReason = "Rejected") => {
    try {
      await leaveApi.reject(id, { rejection_reason: rejectionReason });
      await pending();
    } catch (err) {
      handleError(err);
    }
  }, [pending]);

  const analyticsData = useCallback(async () => {
    try {
      const res = await leaveApi.analytics();
      setAnalytics(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  }, []);

  return {
    leaves,
    balance,
    analytics,
    loading,
    error,
    myLeaves,
    pending,
    getBalance,
    requestLeave,
    approve,
    reject,
    analyticsData,
    refresh: myLeaves
  };
};
