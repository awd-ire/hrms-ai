import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { recruitmentApi } from "@/api/recruitmentApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Backend:
 * POST /api/recruitment/jobs
 */

const JobPostingForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      await recruitmentApi.createJob(data);
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
      <h2 className="font-semibold">Create Job Posting</h2>

      {error && <ApiError error={{ message: error.message }} />}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3">
        <input
          {...register("title", { required: true })}
          placeholder="Job Title"
          className="p-2 border rounded"
        />

        <input
          {...register("department_id", { required: true })}
          placeholder="Department ID"
          className="p-2 border rounded"
        />

        <input
          {...register("location")}
          placeholder="Location"
          className="p-2 border rounded"
        />

        <select
          {...register("status")}
          className="p-2 border rounded"
        >
          <option value="open">Open</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>

        <textarea
          {...register("description", { required: true })}
          placeholder="Job Description"
          className="p-2 border rounded col-span-2"
        />

        <div className="col-span-2">
          <Button type="submit" loading={loading}>
            Create Job
          </Button>
        </div>
      </form>
    </div>
  );
};

export default JobPostingForm;