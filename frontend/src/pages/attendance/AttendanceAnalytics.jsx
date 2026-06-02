import React, { useEffect, useState } from "react";
import { attendanceApi } from "@/api/attendanceApi";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Attendance Analytics Dashboard
 * Uses /api/attendance/analytics
 */
const AttendanceAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await attendanceApi.analytics();
      setData(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ApiError error={{ message: error.message }} />;

  const pieData = [
    { name: "Present", value: data?.present || 0 },
    { name: "Absent", value: data?.absent || 0 },
    { name: "Leave", value: data?.leave || 0 }
  ];

  const COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Attendance Analytics</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Distribution</h2>

          <PieChart width={300} height={250}>
            <Pie
              data={pieData}
              dataKey="value"
              outerRadius={80}
              label
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Summary</h2>

          <BarChart width={300} height={250} data={pieData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </div>
      </div>
    </div>
  );
};

export default AttendanceAnalytics;