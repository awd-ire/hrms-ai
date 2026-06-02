import React, { useEffect, useMemo } from "react";
import { useAttendance } from "@/hooks/useAttendance";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";
import Badge from "@/components/common/Badge";
import StatCard from "@/components/common/StatCard";

/**
 * Manager Team Attendance
 * Backend: GET /api/attendance/team
 */
const TeamAttendance = () => {
  const { records, loading, error, teamAttendance } = useAttendance();

  useEffect(() => {
    teamAttendance();
  }, [teamAttendance]);

  const summary = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        acc.total += 1;
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0, leave: 0 }
    );
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Team Attendance</h1>
        <p className="text-sm text-gray-500">
          Review attendance records for your direct reports.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Records" value={summary.total} />
        <StatCard title="Present" value={summary.present} />
        <StatCard title="Absent" value={summary.absent} />
        <StatCard title="Late" value={summary.late} />
        <StatCard title="Leave" value={summary.leave} />
      </div>

      {error && <ApiError error={{ message: error }} onRetry={teamAttendance} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Employee</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Check In</th>
                <th className="p-2 text-left">Check Out</th>
                <th className="p-2 text-left">Hours</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {records?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-b dark:border-gray-700">
                    <td className="p-2 font-medium">#{record.employee_id}</td>
                    <td className="p-2">{record.attendance_date || "-"}</td>
                    <td className="p-2">{record.check_in || "-"}</td>
                    <td className="p-2">{record.check_out || "-"}</td>
                    <td className="p-2">{record.total_hours || "-"}</td>
                    <td className="p-2">
                      <Badge
                        label={record.status}
                        type={
                          record.status === "present"
                            ? "success"
                            : record.status === "absent"
                            ? "danger"
                            : "warning"
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeamAttendance;
