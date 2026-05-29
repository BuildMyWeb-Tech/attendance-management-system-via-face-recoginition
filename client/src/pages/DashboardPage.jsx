import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI } from '../services/api';
import { connectSocket } from '../socket/socket';
import {
  MdPeople, MdCheckCircle, MdAccessTime, MdTrendingUp,
  MdFaceRetouchingNatural, MdPersonAdd, MdRefresh, MdList
} from 'react-icons/md';

const StatusBadge = ({ status }) => {
  const map = {
    present: 'badge-success',
    late: 'badge-warning',
    absent: 'badge-danger',
  };
  return <span className={map[status] || 'badge-success'}>{status}</span>;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalEmployees: 0, todayCount: 0 });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await attendanceAPI.getDashboard();
      setStats(res.data.stats);
      setLogs(res.data.recentLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const socket = connectSocket();
    socket.on('attendanceMarked', (data) => {
      setStats(prev => ({ ...prev, todayCount: prev.todayCount + 1 }));
      setLogs(prev => [data, ...prev.slice(0, 9)]);
    });
    return () => socket.off('attendanceMarked');
  }, [fetchDashboard]);

  const statCards = [
    { label: 'Total Employees', value: stats.totalEmployees, icon: MdPeople, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/30' },
    { label: 'Present Today', value: stats.todayCount, icon: MdCheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/30' },
    { label: "Today's Date", value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: MdAccessTime, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-800/30' },
    {
      label: 'Attendance Rate',
      value: stats.totalEmployees ? `${Math.round((stats.todayCount / stats.totalEmployees) * 100)}%` : '0%',
      icon: MdTrendingUp, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/30'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Attendance overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={fetchDashboard} className="btn-secondary flex items-center gap-2 text-sm">
          <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card p-5 border ${bg}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
                <p className={`text-3xl font-bold mt-2 ${color}`}>{loading ? '—' : value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => navigate('/verify')} className="card p-6 text-left hover:border-primary-700 hover:bg-primary-900/10 transition-all group border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-900/50 rounded-xl flex items-center justify-center group-hover:bg-primary-600/30 transition-all">
              <MdFaceRetouchingNatural className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">Mark Attendance</p>
              <p className="text-slate-500 text-sm mt-0.5">Scan face to mark attendance</p>
            </div>
          </div>
        </button>
        <button onClick={() => navigate('/register')} className="card p-6 text-left hover:border-emerald-700 hover:bg-emerald-900/10 transition-all group border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-900/30 rounded-xl flex items-center justify-center group-hover:bg-emerald-600/30 transition-all">
              <MdPersonAdd className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">Register Employee</p>
              <p className="text-slate-500 text-sm mt-0.5">Add new employee face data</p>
            </div>
          </div>
        </button>
        <button onClick={() => navigate('/employees')} className="card p-6 text-left hover:border-slate-600 hover:bg-slate-800/50 transition-all group border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-slate-700 transition-all">
              <MdPeople className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">View Employees</p>
              <p className="text-slate-500 text-sm mt-0.5">Manage registered employees</p>
            </div>
          </div>
        </button>
      </div> */}

      {/* Recent logs */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-slate-200">Recent Attendance</h2>
          <button onClick={() => navigate('/attendance')} className="text-primary-400 hover:text-primary-300 text-sm">View all →</button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No attendance records yet today</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="px-6 py-3 text-left font-medium">Employee</th>
                  <th className="px-6 py-3 text-left font-medium hidden sm:table-cell">Department</th>
                  <th className="px-6 py-3 text-left font-medium">Time</th>
                  {/* <th className="px-6 py-3 text-left font-medium">Status</th> */}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-200">{log.employeeName}</p>
                        <p className="text-slate-500 text-xs">{log.employeeId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 hidden sm:table-cell">{log.department || 'General'}</td>
                    <td className="px-6 py-4 text-slate-400">{log.time}</td>
                    {/* <td className="px-6 py-4"><StatusBadge status={log.status} /></td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
