import { useState, useEffect, useCallback } from 'react';
import { qrAPI } from '../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  MdListAlt, MdSearch, MdFilterList, MdDownload, MdRefresh,
  MdCheckCircle, MdError, MdPictureAsPdf,
} from 'react-icons/md';

const PER_PAGE = 20;

const StatusBadge = ({ status }) => {
  if (status === 'SUCCESS')
    return <span className="badge-success">Success</span>;
  return <span className="badge-danger">Failed</span>;
};

export default function QRScanLogsPage() {
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [page,       setPage]       = useState(1);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qrAPI.getLogs({
        page,
        limit: PER_PAGE,
        search:   search   || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
      });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load QR scan logs');
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* ── Export CSV ── */
  const exportCSV = async () => {
    try {
      const res = await qrAPI.exportLogsCSV({
        search:   search   || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = 'qr_scan_logs_' + today + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  /* ── Export PDF ── */
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('QR Scan Logs', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Generated: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      14, 22
    );

    if (search || dateFrom || dateTo) {
      const filters = [];
      if (search)   filters.push('Search: ' + search);
      if (dateFrom) filters.push('From: ' + dateFrom);
      if (dateTo)   filters.push('To: ' + dateTo);
      doc.text('Filters: ' + filters.join(' | '), 14, 28);
    }

    autoTable(doc, {
      startY: search || dateFrom || dateTo ? 33 : 27,
      head: [['Date', 'Time', 'Emp Code', 'Employee Name', 'Department', 'Status', 'Fail Reason', 'Scanned By']],
      body: logs.map(log => [
        new Date(log.scannedAt).toLocaleDateString('en-IN',  { timeZone: 'Asia/Kolkata' }),
        new Date(log.scannedAt).toLocaleTimeString('en-IN',  { timeZone: 'Asia/Kolkata' }),
        log.employeeCode,
        log.employeeName,
        log.department || 'General',
        log.status,
        log.failReason || '—',
        log.scannedBy,
      ]),
      styles:         { fontSize: 8, cellPadding: 3 },
      headStyles:     { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles:   { 3: { cellWidth: 35 }, 6: { cellWidth: 40 } },
    });

    doc.save('qr_scan_logs_' + today + '.pdf');
    toast.success('PDF downloaded');
  };

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters   = search || dateFrom || dateTo;
  const totalPages   = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">QR Scan Logs</h1>
          <p className="text-slate-400 text-sm mt-1">{total} total scan records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="btn-secondary flex items-center gap-2 text-sm">
            <MdRefresh className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <MdDownload className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportPDF} className="btn-secondary flex items-center gap-2 text-sm">
            <MdPictureAsPdf className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search employee name or code..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-9 text-sm py-2.5"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <MdFilterList className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="input-field pl-9 text-sm py-2.5 w-40"
                title="From date"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="input-field text-sm py-2.5 w-40"
                title="To date"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={() => { setDateFrom(today); setDateTo(today); setPage(1); }}
            className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
          >
            <MdCheckCircle className="w-4 h-4" /> Today
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="text-slate-500 hover:text-slate-300 text-sm">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <MdListAlt className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No scan logs found</p>
            <p className="text-slate-600 text-sm mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'QR scan logs will appear here'}
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 bg-slate-900/50">
                    <th className="px-5 py-3 text-left font-medium">Date / Time</th>
                    <th className="px-5 py-3 text-left font-medium">Emp Code</th>
                    <th className="px-5 py-3 text-left font-medium">Name</th>
                    <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Department</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Fail Reason</th>
                    <th className="px-5 py-3 text-left font-medium hidden sm:table-cell">Scanned By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-slate-300 text-xs">
                          {new Date(log.scannedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {new Date(log.scannedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-300 font-mono text-xs">{log.employeeCode}</td>
                      <td className="px-5 py-4 font-medium text-slate-200">{log.employeeName}</td>
                      <td className="px-5 py-4 text-slate-400 hidden md:table-cell text-xs">{log.department || 'General'}</td>
                      <td className="px-5 py-4"><StatusBadge status={log.status} /></td>
                      <td className="px-5 py-4 text-slate-500 text-xs hidden lg:table-cell">
                        {log.failReason || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs hidden sm:table-cell">{log.scannedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between text-sm">
                <p className="text-slate-500">Page {page} of {totalPages} · {total} records</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >←</button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
                  >→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}