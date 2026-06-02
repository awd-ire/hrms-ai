import React, { useEffect } from "react";
import { useAttendance } from "@/hooks/useAttendance";
import AttendanceRow from "@/pages/attendance/AttendanceRow";
import Button from "@/components/common/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

/**
 * Employee attendance dashboard
 */
const MyAttendance = () => {
  const {
    records,
    loading,
    error,
    myAttendance,
    checkIn,
    checkOut
  } = useAttendance();

  useEffect(() => {
    myAttendance();
  }, [myAttendance]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Attendance</h1>

      <div className="flex gap-2">
        <Button onClick={checkIn}>Check In</Button>
        <Button variant="secondary" onClick={checkOut}>
          Check Out
        </Button>
        <Button variant="ghost" onClick={myAttendance}>
          Refresh
        </Button>
      </div>

      {error && <ApiError error={{ message: error }} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Check In</th>
                <th className="p-2 text-left">Check Out</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {records?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center">
                    No attendance records
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <AttendanceRow key={i} record={r} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyAttendance;