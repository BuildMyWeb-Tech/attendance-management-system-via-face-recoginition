import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MdDashboard, MdPersonAdd, MdFaceRetouchingNatural, MdAssignment,
  MdLogout, MdMenu, MdClose, MdConstruction, MdPerson, MdPeople
} from 'react-icons/md';

const navItems = [
  { to: '/', label: 'Dashboard', icon: MdDashboard, exact: true },
  { to: '/employees', label: 'Employees', icon: MdPeople },
  { to: '/register', label: 'Register Employee', icon: MdPersonAdd },
  { to: '/verify', label: 'Face Verify', icon: MdFaceRetouchingNatural },
  { to: '/attendance', label: 'Attendance', icon: MdAssignment },
];

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavItem = ({ to, label, icon: Icon, exact }) => (
    <NavLink
      to={to}
      end={exact}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
          <MdConstruction className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-white leading-none">FaceTrack</p>
          <p className="text-xs text-slate-500 mt-0.5">Attendance System</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center">
            <MdPerson className="w-4 h-4 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{admin?.name}</p>
            <p className="text-xs text-slate-500">Administrator</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-900/20 rounded-xl transition-all text-sm">
          <MdLogout className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 fixed h-full z-10">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 lg:px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400">
            <MdMenu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            {/* <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-500">System Online</span>
            </div> */}
          </div>
          {/* <div className="text-right hidden sm:block">
            <p className="text-sm text-slate-300">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-slate-500">{new Date().toLocaleTimeString()}</p>
          </div> */}
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
