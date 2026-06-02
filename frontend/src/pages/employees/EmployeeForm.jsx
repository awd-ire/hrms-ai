import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeCreateSchema } from "@/validation/employeeSchemas";
import Button from "@/components/common/Button";

const EmployeeForm = ({ onCreate }) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(employeeCreateSchema),
    mode: "onSubmit"
  });

  const submitHandler = async (data) => {
    setLoading(true);
    try {
      await onCreate(data);
      reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="font-semibold mb-3">Add Employee</h2>

      <form onSubmit={handleSubmit(submitHandler)} className="grid grid-cols-2 gap-3">
        <input
          {...register("employee_code")}
          placeholder="Employee Code"
          className="p-2 border rounded"
        />
        {errors.employee_code && <p>{errors.employee_code.message}</p>}

        <input
          {...register("first_name")}
          placeholder="First Name"
          className="p-2 border rounded"
        />

        <input
          {...register("last_name")}
          placeholder="Last Name"
          className="p-2 border rounded"
        />

        <input
          {...register("email")}
          placeholder="Email"
          className="p-2 border rounded"
        />

        <input
          {...register("designation")}
          placeholder="Designation"
          className="p-2 border rounded"
        />

        <input
          type="number"
          {...register("salary", { valueAsNumber: true })}
          placeholder="Salary"
          className="p-2 border rounded"
        />

        <input
          type="number"
          {...register("department_id", { valueAsNumber: true })}
          placeholder="Department ID"
          className="p-2 border rounded"
        />

        <input
          type="date"
          {...register("hire_date")}
          className="p-2 border rounded"
        />

        <div className="col-span-2">
          <Button type="submit" loading={loading}>
            Create Employee
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;