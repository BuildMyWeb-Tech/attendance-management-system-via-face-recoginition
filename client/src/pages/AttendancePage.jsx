import { useState, useEffect, useCallback } from 'react';
import { attendanceAPI } from '../services/api';
import { MdSearch, MdFilterList, MdDownload, MdRefresh, MdCheckCircle, MdSchedule } from 'react-icons/md';

const StatusBadge = ({ status }) => {
  const map = { present: 'badge-success', late: 'badge-warning', absent: 'badge-danger' };
  return <span className={map[status] || 'badge-success'}>{status}</span>;
};

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ date: '', employeeId: '' });
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceAPI.getAll({ ...filters, page, limit: PER_PAGE });
      setRecords(res.data.records);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const exportCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Date', 'Time', 'Status'];
    const rows = records.map(r => [r.employeeId, r.employeeName, r.department || 'General', r.date, r.time, r.status]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date().toISOString().split('T')[0];
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Records</h1>
          <p className="text-slate-400 text-sm mt-1">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRecords} className="btn-secondary flex items-center gap-2 text-sm">
            <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {/* <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <MdDownload className="w-4 h-4" /> Export CSV
          </button> */}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search by Employee ID..." value={filters.employeeId}
            onChange={e => { setFilters(p => ({ ...p, employeeId: e.target.value })); setPage(1); }}
            className="input-field pl-9 text-sm py-2.5" />
        </div>
        <div className="relative sm:w-48">
          <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="date" value={filters.date}
            onChange={e => { setFilters(p => ({ ...p, date: e.target.value })); setPage(1); }}
            className="input-field pl-9 text-sm py-2.5" />
        </div>
        {(filters.date || filters.employeeId) && (
          <button onClick={() => { setFilters({ date: '', employeeId: '' }); setPage(1); }}
            className="btn-secondary text-sm px-4">Clear</button>
        )}
      </div>

      {/* Quick filter for today */}
      {!filters.date && (
        <button onClick={() => setFilters(p => ({ ...p, date: today }))}
          className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
          <MdCheckCircle className="w-4 h-4" /> Show today only
        </button>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
            Loading records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <MdSchedule className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No records found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 bg-slate-900/50">
                    <th className="px-6 py-3 text-left font-medium">Employee ID</th>
                    <th className="px-6 py-3 text-left font-medium">Name</th>
                    <th className="px-6 py-3 text-left font-medium hidden md:table-cell">Department</th>
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                    <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">Time</th>
                    {/* <th className="px-6 py-3 text-left font-medium">Status</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {records.map((r, i) => (
                    <tr key={i} className={`hover:bg-slate-800/50 transition-colors ${r.date === today ? 'bg-primary-900/5' : ''}`}>
                      <td className="px-6 py-4 text-primary-400 font-mono text-xs">{r.employeeId}</td>
                      <td className="px-6 py-4 font-medium text-slate-200">{r.employeeName}</td>
                      <td className="px-6 py-4 text-slate-400 hidden md:table-cell">{r.department || 'General'}</td>
                      <td className="px-6 py-4 text-slate-400">{r.date}</td>
                      <td className="px-6 py-4 text-slate-400 hidden sm:table-cell">{r.time}</td>
                      {/* <td className="px-6 py-4"><StatusBadge status={r.status} /></td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-sm">
                <p className="text-slate-500">Page {page} of {totalPages} · {total} records</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5">←</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs px-3 py-1.5">→</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
