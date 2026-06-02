import { useCallback, useEffect, useState } from "react";
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
      await myLeaves();
    } catch (err) {
      handleError(err);
    }
  }, [myLeaves]);

  const reject = useCallback(async (id) => {
    try {
      await leaveApi.reject(id);
      await myLeaves();
    } catch (err) {
      handleError(err);
    }
  }, [myLeaves]);

  const analyticsData = useCallback(async () => {
    try {
      const res = await leaveApi.analytics();
      setAnalytics(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  }, []);

  useEffect(() => {
    myLeaves();
  }, [myLeaves]);

  return {
    leaves,
    balance,
    analytics,
    loading,
    error,
    myLeaves,
    getBalance,
    requestLeave,
    approve,
    reject,
    analyticsData,
    refresh: myLeaves
  };
};