import { useState, useEffect, useCallback } from 'react';
import { gatePunchAPI } from '../services/api';
import { connectSocket } from '../socket/socket';
import toast from 'react-hot-toast';
import {
  MdSensors, MdRefresh, MdLocationOn, MdCameraAlt,
  MdCheckCircle, MdFilterList, MdDownload,
} from 'react-icons/md';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PER_PAGE = 20;

export default function GatePunchDashboard() {
  const [records,    setRecords]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [page,       setPage]       = useState(1);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gatePunchAPI.getLogs({
        date:  dateFilter || undefined,
        page,
        limit: PER_PAGE,
      });
      setRecords(res.data.records);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load gate punch logs');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time socket updates
  useEffect(() => {
    const socket = connectSocket();
    const handler = (data) => {
      if (data.punchType === 'gate') {
        setTotal(t => t + 1);
        setRecords(prev => [data, ...prev.slice(0, PER_PAGE - 1)]);
      }
    };
    socket.on('attendanceMarked', handler);
    return () => socket.off('attendanceMarked', handler);
  }, []);

  const exportCSV = () => {
    const headers = ['Employee', 'ID', 'Department', 'Location', 'Date', 'Time', 'Status', 'GPS Lat', 'GPS Lng'];
    const rows = records.map(r => [
      r.employeeName,
      r.employeeId,
      r.department || 'General',
      r.locationName || '',
      r.date,
      r.time,
      r.status,
      r.gps && r.gps.lat != null ? r.gps.lat : '',
      r.gps && r.gps.lng != null ? r.gps.lng : '',
    ]);
    const csv  = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'gate_punch_' + today + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  const renderGPS = (r) => {
    if (r.gps && r.gps.lat != null && r.gps.lng != null) {
      return (
        <span className="text-xs font-mono text-slate-500">
          {Number(r.gps.lat).toFixed(4)}, {Number(r.gps.lng).toFixed(4)}
        </span>
      );
    }
    return <span className="text-slate-700 text-xs">—</span>;
  };

  const renderSelfie = (r) => {
    if (r.selfieImage) {
      return (
  <a
    href={API_URL + r.selfieImage}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-block"
  >
    <img
      src={API_URL + r.selfieImage}
      alt="selfie"
      className="w-10 h-10 object-cover rounded-lg border border-slate-700 hover:border-primary-500 transition-all"
    />
  </a>
);
    }
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
        <MdCameraAlt className="w-4 h-4 text-slate-600" />
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Gate Punch Logs</h1>
          <p className="text-slate-400 text-sm mt-1">{total} total gate punch records</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <MdRefresh className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </button>
          <button
            onClick={exportCSV}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <MdDownload className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="relative sm:w-52">
          <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); setPage(1); }}
            className="input-field pl-9 text-sm py-2.5"
          />
        </div>
        <button
          onClick={() => { setDateFilter(today); setPage(1); }}
          className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
        >
          <MdCheckCircle className="w-4 h-4" /> Today
        </button>
        {dateFilter && (
          <button
            onClick={() => { setDateFilter(''); setPage(1); }}
            className="text-slate-500 hover:text-slate-300 text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <MdSensors className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No gate punch records found</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 bg-slate-900/50">
                    <th className="px-5 py-3 text-left font-medium">Employee</th>
                    <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Location</th>
                    <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">Date</th>
                    <th className="px-5 py-3 text-left font-medium">Time (IST)</th>
                    <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">GPS</th>
                    <th className="px-5 py-3 text-left font-medium">Selfie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">{r.employeeName}</p>
                        <p className="text-slate-500 text-xs">{r.employeeId}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MdLocationOn className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                          <span className="text-xs">{r.locationName || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 hidden sm:table-cell text-xs">
                        {r.date}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {r.time}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {renderGPS(r)}
                      </td>
                      <td className="px-5 py-4">
                        {renderSelfie(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between text-sm">
                <p className="text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}