import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeCreateFormSchema,
  employeeUpdateSchema,
} from "@/validation/employeeSchemas";
import { departmentApi } from "@/api/departmentApi";
import Button from "@/components/common/Button";

const today = new Date().toISOString().slice(0, 10);

const normalizeValues = (values = {}, mode) => {
  const safeValues = values ?? {};

  return {
    employee_code: safeValues.employee_code ?? "",
    first_name: safeValues.first_name ?? "",
    last_name: safeValues.last_name ?? "",
    email: safeValues.email ?? "",
    phone: safeValues.phone ?? "",
    designation: safeValues.designation ?? "",
    hire_date: safeValues.hire_date ?? today,
    salary: safeValues.salary ?? "",
    department_id: safeValues.department_id ?? "",
    manager_id: safeValues.manager_id ?? "",
    status: safeValues.status ?? "active",
    is_active: safeValues.is_active ?? mode === "create",
  };
};

const numberValue = (value) =>
  value === "" || value === null || value === undefined
    ? undefined
    : Number(value);

const optionalNumberValue = (value) =>
  value === "" || value === null || value === undefined
    ? null
    : Number(value);

const asArray = (value) => (Array.isArray(value) ? value : []);

const EmployeeForm = ({
  mode = "create",
  initialValues = null,
  onSubmit,
  onCancel,
  submitLabel,
}) => {
  const isEdit = mode === "edit";
  const schema = isEdit ? employeeUpdateSchema : employeeCreateFormSchema;
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [departmentError, setDepartmentError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: normalizeValues(initialValues, mode),
  });

  useEffect(() => {
    reset(normalizeValues(initialValues, mode));
  }, [initialValues, mode, reset]);

  useEffect(() => {
    const loadDepartments = async () => {
      setDepartmentLoading(true);
      setDepartmentError(null);

      try {
        const res = await departmentApi.getAll();
        setDepartments(asArray(res.data));
      } catch (err) {
        setDepartmentError(err?.message || "Failed to load departments");
      } finally {
        setDepartmentLoading(false);
      }
    };

    loadDepartments();
  }, []);

  const submitHandler = async (data) => {
    setLoading(true);

    try {
      const payload = {
        ...data,
        salary: numberValue(data.salary),
        department_id: numberValue(data.department_id),
        manager_id: optionalNumberValue(data.manager_id),
      };

      if (!payload.phone) payload.phone = null;
      if (!payload.status) payload.status = "active";
      if (payload.manager_id === undefined) payload.manager_id = null;

      await onSubmit?.(payload);

      if (!isEdit) {
        reset(normalizeValues({}, mode));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600";

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold">
          {isEdit ? "Edit Employee" : "Add Employee"}
        </h2>
        <p className="text-xs text-gray-500">
          Department ID must already exist. This form creates a standalone
          employee record without linking it to a login account.
        </p>
      </div>

      <form onSubmit={handleSubmit(submitHandler)} className="grid grid-cols-2 gap-3">
        <div>
          <input
            {...register("employee_code")}
            placeholder="Employee Code"
            className={`w-full ${inputClass}`}
          />
          {errors.employee_code && (
            <p className="text-xs text-red-600 mt-1">{errors.employee_code.message}</p>
          )}
        </div>

        <div>
          <input
            {...register("first_name")}
            placeholder="First Name"
            className={`w-full ${inputClass}`}
          />
          {errors.first_name && (
            <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <input
            {...register("last_name")}
            placeholder="Last Name"
            className={`w-full ${inputClass}`}
          />
          {errors.last_name && (
            <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>
          )}
        </div>

        <div>
          <input
            type="email"
            {...register("email")}
            placeholder="Email"
            className={`w-full ${inputClass}`}
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <input
            {...register("phone")}
            placeholder="Phone"
            className={`w-full ${inputClass}`}
          />
        </div>

        <div>
          <input
            {...register("designation")}
            placeholder="Designation"
            className={`w-full ${inputClass}`}
          />
          {errors.designation && (
            <p className="text-xs text-red-600 mt-1">{errors.designation.message}</p>
          )}
        </div>

        <div>
          <input
            type="date"
            {...register("hire_date")}
            className={`w-full ${inputClass}`}
          />
          {errors.hire_date && (
            <p className="text-xs text-red-600 mt-1">{errors.hire_date.message}</p>
          )}
        </div>

        <div>
          <input
            type="number"
            step="0.01"
            {...register("salary", { setValueAs: numberValue })}
            placeholder="Salary"
            className={`w-full ${inputClass}`}
          />
          {errors.salary && (
            <p className="text-xs text-red-600 mt-1">{errors.salary.message}</p>
          )}
        </div>

        <div>
          <select
            {...register("department_id", { setValueAs: numberValue })}
            className={`w-full ${inputClass}`}
            disabled={departmentLoading}
          >
            <option value="">{departmentLoading ? "Loading departments..." : "Select Department"}</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          {errors.department_id && (
            <p className="text-xs text-red-600 mt-1">{errors.department_id.message}</p>
          )}
          {departmentError && (
            <p className="text-xs text-red-600 mt-1">{departmentError}</p>
          )}
        </div>

        <div>
          <input
            type="number"
            {...register("manager_id", { setValueAs: optionalNumberValue })}
            placeholder="Manager ID"
            className={`w-full ${inputClass}`}
          />
        </div>

        <div>
          <select
            {...register("status")}
            className={`w-full ${inputClass}`}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input type="checkbox" {...register("is_active")} />
          Active employee
        </label>

        <div className="col-span-2 flex flex-wrap gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}

          <Button type="submit" loading={loading}>
            {submitLabel || (isEdit ? "Update Employee" : "Create Employee")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
