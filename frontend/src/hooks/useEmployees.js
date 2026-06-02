import { useCallback, useEffect, useState } from "react";
import { employeeApi } from "@/api/employeeApi";

export const useEmployees = (scope = "all") => {
  const [employees, setEmployees] = useState([]);
  const [employee, setEmployee] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => {
    setError(err?.message || "Something went wrong");
  };

  const getAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res =
        scope === "team"
          ? await employeeApi.myTeam()
          : await employeeApi.getAll();
      setEmployees(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  const getById = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await employeeApi.getById(id);
      setEmployee(res.data);
      return res.data;
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await employeeApi.create(payload);
      await getAll();
      return res.data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAll]);

  const update = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await employeeApi.update(id, payload);
      await getAll();
      return res.data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAll]);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const res = await employeeApi.delete(id);
      await getAll();
      return res.data;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAll]);

  useEffect(() => {
    if (!scope) return;
    getAll();
  }, [getAll, scope]);

  return {
    employees,
    employee,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove,
    refresh: getAll
  };
};
