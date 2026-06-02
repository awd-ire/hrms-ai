import { useCallback, useEffect, useState } from "react";
import { attendanceApi } from "@/api/attendanceApi";

export const useAttendance = () => {
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => setError(err?.message || "Attendance error");

  const myAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await attendanceApi.myAttendance();
      setRecords(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const teamAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await attendanceApi.teamAttendance();
      setRecords(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyticsData = useCallback(async () => {
    try {
      const res = await attendanceApi.analytics();
      setAnalytics(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  }, []);

  const checkIn = useCallback(async () => {
    try {
      await attendanceApi.checkIn();
      await myAttendance();
    } catch (err) {
      handleError(err);
    }
  }, [myAttendance]);

  const checkOut = useCallback(async () => {
    try {
      await attendanceApi.checkOut();
      await myAttendance();
    } catch (err) {
      handleError(err);
    }
  }, [myAttendance]);

  useEffect(() => {
    myAttendance();
  }, [myAttendance]);

  return {
    records,
    analytics,
    loading,
    error,
    myAttendance,
    teamAttendance,
    analyticsData,
    checkIn,
    checkOut,
    refresh: myAttendance
  };
};