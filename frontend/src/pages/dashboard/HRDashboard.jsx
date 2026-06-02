import React, { useEffect, useState } from "react";
import { dashboardApi } from "@/api/dashboardApi";
import StatCard from "@/components/common/StatCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * HR Dashboard
 * Backend: GET /api/dashboard/hr
 */

const HRDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await dashboardApi.hr();
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
      <h1 className="text-xl font-bold">HR Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Open Jobs" value={data?.open_jobs} />
        <StatCard title="Candidates" value={data?.candidates} />
        <StatCard title="Interviews" value={data?.interviews} />
        <StatCard title="Pending Approvals" value={data?.pending_approvals} />
      </div>
    </div>
  );
};

export default HRDashboard;