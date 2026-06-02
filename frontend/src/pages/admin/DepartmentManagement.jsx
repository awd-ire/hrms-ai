import React, { useEffect, useState } from "react";
import { departmentApi } from "@/api/departmentApi";
import Table from "@/components/common/Table";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ApiError from "@/components/common/ApiError";

const emptyForm = {
  name: "",
  code: "",
  description: "",
};

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const openCreate = () => {
    setEditorMode("create");
    setSelectedDepartment(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (department) => {
    setEditorMode("edit");
    setSelectedDepartment(department);
    setForm({
      name: department.name || "",
      code: department.code || "",
      description: department.description || "",
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setSelectedDepartment(null);
    setForm(emptyForm);
    setEditorMode("create");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || null,
      };

      if (editorMode === "edit" && selectedDepartment) {
        await departmentApi.update(selectedDepartment.id, payload);
      } else {
        await departmentApi.create(payload);
      }

      closeEditor();
      await loadDepartments();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Delete "${department.name}"? This should only be done if no active employees are assigned.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await departmentApi.remove(department.id);
      await loadDepartments();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    {
      key: "description",
      label: "Description",
      render: (row) => row.description || "-",
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => handleDelete(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Department Management</h1>
          <p className="text-sm text-gray-500">
            Maintain the company department master data used across employee records and reporting.
          </p>
        </div>

        <Button onClick={openCreate}>Add Department</Button>
      </div>

      {error && <ApiError error={{ message: error.message }} onRetry={loadDepartments} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Table columns={columns} data={departments} />
      )}

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={editorMode === "edit" ? "Edit Department" : "Add Department"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Department Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700"
                placeholder="Human Resources"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Department Code
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700"
                placeholder="HR"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700"
              placeholder="Optional notes about this department"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeEditor}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editorMode === "edit" ? "Update Department" : "Create Department"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentManagement;
