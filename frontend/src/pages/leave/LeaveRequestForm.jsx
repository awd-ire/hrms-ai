import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leaveRequestSchema } from "@/validation/leaveSchemas";
import { leaveApi } from "@/api/leaveApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Leave Request Form
 * Backend: POST /api/leave/request
 */

const LeaveRequestForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(leaveRequestSchema),
    mode: "onSubmit"
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");

  const calculateTotalDays = (start, end) => {
    if (!start || !end) return null;

    const startTime = new Date(start);
    const endTime = new Date(end);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return null;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.floor((endTime - startTime) / msPerDay) + 1;
    return diff > 0 ? diff : null;
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const totalDays = calculateTotalDays(data.start_date, data.end_date);

      if (!totalDays) {
        throw new Error("End date must be on or after start date");
      }

      await leaveApi.request({
        ...data,
        total_days: totalDays
      });
      reset();
      onSuccess?.();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
      <h2 className="font-semibold">Request Leave</h2>

      {error && <ApiError error={{ message: error.message }} />}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3">
        <select
          {...register("leave_type")}
          className="p-2 border rounded"
        >
          <option value="sick">Sick</option>
          <option value="casual">Casual</option>
          <option value="earned">Earned</option>
          <option value="unpaid">Unpaid</option>
        </select>
        {errors.leave_type && <p>{errors.leave_type.message}</p>}

        <input
          type="date"
          {...register("start_date")}
          className="p-2 border rounded"
        />

        <input
          type="date"
          {...register("end_date")}
          className="p-2 border rounded"
        />

        <div className="col-span-2 text-sm text-gray-500">
          Total days: {calculateTotalDays(startDate, endDate) ?? "Select dates"}
        </div>

        <input
          {...register("reason")}
          placeholder="Reason"
          className="p-2 border rounded col-span-2"
        />

        <div className="col-span-2">
          <Button type="submit" loading={loading}>
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
