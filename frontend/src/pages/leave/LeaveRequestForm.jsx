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
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(leaveRequestSchema),
    mode: "onSubmit"
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      await leaveApi.request(data);
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