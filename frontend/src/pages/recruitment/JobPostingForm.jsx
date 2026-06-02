import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { recruitmentApi } from "@/api/recruitmentApi";
import { departmentApi } from "@/api/departmentApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Backend:
 * POST /api/recruitment/jobs
 */

const JobPostingForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  useEffect(() => {
    const loadDepartments = async () => {
      setDepartmentLoading(true);

      try {
        const res = await departmentApi.getAll();
        setDepartments(res.data);
      } catch (err) {
        setError(err);
      } finally {
        setDepartmentLoading(false);
      }
    };

    loadDepartments();
  }, []);

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

        <select
          {...register("department_id", { required: true })}
          className="p-2 border rounded"
          disabled={departmentLoading}
        >
          <option value="">
            {departmentLoading ? "Loading departments..." : "Select Department"}
          </option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

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

        <textarea
          {...register("requirements", { required: true })}
          placeholder="Requirements"
          className="p-2 border rounded col-span-2"
        />

        <select
          {...register("employment_type", { required: true })}
          className="p-2 border rounded"
        >
          <option value="">Select Employment Type</option>
          <option value="full-time">Full Time</option>
          <option value="part-time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
        </select>

        <input
          {...register("salary_range")}
          placeholder="Salary Range"
          className="p-2 border rounded"
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
