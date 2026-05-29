import { useState, useEffect, useCallback } from 'react';
import { employeeAPI } from '../services/api';
import toast from 'react-hot-toast';

const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data.employees);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEmployee = useCallback(async (id, name) => {
    if (!confirm(`Delete employee "${name}"? This cannot be undone.`)) return false;
    try {
      await employeeAPI.delete(id);
      setEmployees(prev => prev.filter(e => e._id !== id));
      toast.success(`${name} removed`);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
      return false;
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  return { employees, loading, error, fetchEmployees, deleteEmployee };
};

export default useEmployees;
