import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmployees from '../hooks/useEmployees';
import ConfirmModal from '../components/ui/ConfirmModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { MdPersonAdd, MdDelete, MdSearch, MdPeople, MdRefresh, MdBadge } from 'react-icons/md';

const DEPT_COLORS = {
  'Site Supervisor': 'text-amber-400 bg-amber-900/20 border-amber-800/30',
  'Foreman': 'text-orange-400 bg-orange-900/20 border-orange-800/30',
  'Electrician': 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
  'Engineer': 'text-blue-400 bg-blue-900/20 border-blue-800/30',
  'Safety Officer': 'text-red-400 bg-red-900/20 border-red-800/30',
  'default': 'text-slate-400 bg-slate-800/50 border-slate-700',
};

const DeptBadge = ({ dept }) => {
  const cls = DEPT_COLORS[dept] || DEPT_COLORS.default;
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>{dept || 'General'}</span>;
};

const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { employees, loading, fetchEmployees, deleteEmployee } = useEmployees();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleDelete = async () => {
    if (!toDelete) return;
    await deleteEmployee(toDelete._id, toDelete.name);
    setToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-slate-400 text-sm mt-1">{employees.length} registered employees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchEmployees} className="btn-secondary flex items-center gap-2 text-sm">
            <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => navigate('/register')} className="btn-primary flex items-center gap-2 text-sm">
            <MdPersonAdd className="w-4 h-4" /> Register Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm py-2.5"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="input-field text-sm py-2.5 sm:w-48"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Summary row */}
      {!loading && employees.length > 0 && (
        <div className="flex gap-4 text-sm text-slate-500">
          <span>Showing <span className="text-slate-300 font-medium">{filtered.length}</span> of {employees.length}</span>
          {(search || deptFilter) && (
            <button onClick={() => { setSearch(''); setDeptFilter(''); }} className="text-primary-400 hover:text-primary-300">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Employee grid */}
      {loading ? (
        <div className="card p-16"><LoadingSpinner size="lg" text="Loading employees..." /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={MdPeople}
            title={search || deptFilter ? 'No employees match your filters' : 'No employees registered yet'}
            description={search || deptFilter ? 'Try adjusting your search or filter' : 'Register employees to get started'}
            action={!search && !deptFilter && (
              <button onClick={() => navigate('/register')} className="btn-primary flex items-center gap-2 mx-auto">
                <MdPersonAdd className="w-4 h-4" /> Register First Employee
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <div key={emp._id} className="card p-5 hover:border-slate-700 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-900/50 flex items-center justify-center text-primary-300 font-bold text-sm flex-shrink-0">
                    {emp.faceImages?.[0] ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${emp.faceImages[0]}`}
                        alt={emp.name}
                        className="w-full h-full object-cover rounded-xl"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <span className={emp.faceImages?.[0] ? 'hidden' : 'flex'}>{getInitials(emp.name)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{emp.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MdBadge className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-500 text-xs font-mono">{emp.employeeId}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setToDelete(emp)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Delete employee"
                >
                  <MdDelete className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <DeptBadge dept={emp.department} />
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-slate-500 text-xs">{emp.faceDescriptors?.length || 0} face angles</span>
                </div>
              </div>

              <p className="text-slate-600 text-xs mt-2">
                Registered {new Date(emp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        title="Delete Employee"
        message={`Remove "${toDelete?.name}" (${toDelete?.employeeId}) and all their face data? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
