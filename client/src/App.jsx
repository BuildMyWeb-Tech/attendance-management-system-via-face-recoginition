import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegistrationPage from './pages/RegistrationPage';
import VerificationPage from './pages/VerificationPage';
import AttendancePage from './pages/AttendancePage';
import EmployeesPage from './pages/EmployeesPage';
import NotFoundPage from './pages/NotFoundPage';
import Layout from './components/layout/Layout';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="register" element={<RegistrationPage />} />
        <Route path="verify" element={<VerificationPage />} />
        <Route path="attendance" element={<AttendancePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
            success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
