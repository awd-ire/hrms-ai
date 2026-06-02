import { useCallback, useEffect, useState } from "react";
import { recruitmentApi } from "@/api/recruitmentApi";

export const useRecruitment = () => {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => setError(err?.message || "Recruitment error");

  const getJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await recruitmentApi.getJobs();
      setJobs(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await recruitmentApi.getCandidates();
      setCandidates(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createJob = useCallback(async (payload) => {
    try {
      await recruitmentApi.createJob(payload);
      await getJobs();
    } catch (err) {
      handleError(err);
    }
  }, [getJobs]);

  const createCandidate = useCallback(async (payload) => {
    try {
      await recruitmentApi.createCandidate(payload);
      await getCandidates();
    } catch (err) {
      handleError(err);
    }
  }, [getCandidates]);

  const updateStage = useCallback(async (id, payload) => {
    try {
      await recruitmentApi.updateStage(id, payload);
      await getCandidates();
    } catch (err) {
      handleError(err);
    }
  }, [getCandidates]);

  const analyticsData = useCallback(async () => {
    try {
      const res = await recruitmentApi.analytics();
      setAnalytics(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  }, []);

  useEffect(() => {
    getJobs();
    getCandidates();
  }, [getJobs, getCandidates]);

  return {
    jobs,
    candidates,
    analytics,
    loading,
    error,
    getJobs,
    getCandidates,
    createJob,
    createCandidate,
    updateStage,
    analyticsData,
    refresh: () => {
      getJobs();
      getCandidates();
    }
  };
};