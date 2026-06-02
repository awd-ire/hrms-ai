import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { performanceApi } from "@/api/performanceApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Backend:
 * POST /api/performance/review
 */

const ReviewForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    mode: "onSubmit"
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      await performanceApi.createReview(data);
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
      <h2 className="font-semibold">Create Performance Review</h2>

      {error && <ApiError error={{ message: error.message }} />}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-3"
      >
        <input
          {...register("employee_id", { required: true })}
          placeholder="Employee ID"
          className="p-2 border rounded"
        />
        {errors.employee_id && <p>Employee ID required</p>}

        <input
          type="number"
          step="0.1"
          {...register("score", { required: true })}
          placeholder="Score (0-5)"
          className="p-2 border rounded"
        />

        <input
          {...register("remarks")}
          placeholder="Remarks"
          className="p-2 border rounded col-span-2"
        />

        <div className="col-span-2">
          <Button type="submit" loading={loading}>
            Submit Review
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;