import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

/**
 * Recruitment Funnel Chart (simplified)
 * Expected data:
 * [
 *  { stage: "Applied", count: 100 },
 *  { stage: "Screening", count: 60 },
 *  { stage: "Interview", count: 30 },
 *  { stage: "Hired", count: 10 }
 * ]
 */

const RecruitmentFunnelChart = ({ data = [] }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="font-semibold mb-3">Recruitment Funnel</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart layout="vertical" data={data}>
          <XAxis type="number" />
          <YAxis dataKey="stage" type="category" />
          <Tooltip />
          <Bar dataKey="count" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RecruitmentFunnelChart;