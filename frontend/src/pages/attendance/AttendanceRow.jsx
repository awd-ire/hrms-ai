import React from "react";
import Badge from "@/components/common/Badge";

/**
 * Single attendance row component
 */
const AttendanceRow = ({ record }) => {
  return (
    <tr className="border-b dark:border-gray-700">
      <td className="p-2">{record.date}</td>
      <td className="p-2">{record.check_in || "-"}</td>
      <td className="p-2">{record.check_out || "-"}</td>
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
  );
};

export default AttendanceRow;