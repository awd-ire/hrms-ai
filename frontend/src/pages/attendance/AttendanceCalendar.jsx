import React, { useEffect, useState } from "react";
import { attendanceApi } from "@/api/attendanceApi";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Simple month view calendar (attendance status mapping)
 * Backend source: GET /api/attendance/my or /employee/{id}
 */
const AttendanceCalendar = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await attendanceApi.myAttendance();
      setRecords(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-green-500";
      case "absent":
        return "bg-red-500";
      case "leave":
        return "bg-yellow-500";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="font-semibold mb-3">Attendance Calendar</h2>

      {error && <ApiError error={{ message: error.message }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {records.map((r, idx) => (
            <div
              key={idx}
              className={`h-10 w-10 rounded flex items-center justify-center text-white text-xs ${getStatusColor(
                r.status
              )}`}
            >
              {new Date(r.date).getDate()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
