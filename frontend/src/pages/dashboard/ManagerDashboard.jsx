import React, { useEffect, useState } from "react";
import { dashboardApi } from "@/api/dashboardApi";
import StatCard from "@/components/common/StatCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Manager Dashboard
 * Backend: GET /api/dashboard/manager
 */

const ManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await dashboardApi.manager();
      setData(res.data.stats);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Manager Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Team Size" value={data?.team_size} />
        <StatCard title="Attendance %" value={data?.attendance} />
        <StatCard title="Pending Leaves" value={data?.pending_leaves} />
        <StatCard title="Performance Score" value={data?.performance_score} />
      </div>
    </div>
  );
};

export default ManagerDashboard;