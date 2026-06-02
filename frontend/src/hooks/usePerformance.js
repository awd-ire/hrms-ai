import { useCallback, useState } from "react";
import { performanceApi } from "@/api/performanceApi";

export const usePerformance = () => {
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => setError(err?.message || "Performance error");

  const myPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await performanceApi.myPerformance();
      setRecords(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const teamPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await performanceApi.teamPerformance();
      setRecords(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createReview = useCallback(async (payload) => {
    try {
      await performanceApi.createReview(payload);
      await myPerformance();
    } catch (err) {
      handleError(err);
    }
  }, [myPerformance]);

  const update = useCallback(async (id, payload) => {
    try {
      await performanceApi.update(id, payload);
      await myPerformance();
    } catch (err) {
      handleError(err);
    }
  }, [myPerformance]);

  const analyticsData = useCallback(async () => {
    try {
      const res = await performanceApi.analytics();
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
    myPerformance,
    teamPerformance,
    createReview,
    update,
    analyticsData,
    refresh: myPerformance
  };
};
