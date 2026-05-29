import { useNavigate } from 'react-router-dom';
import { MdConstruction, MdArrowBack } from 'react-icons/md';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-2xl mb-6 border border-slate-800">
          <MdConstruction className="w-10 h-10 text-slate-600" />
        </div>
        <h1 className="text-6xl font-bold text-slate-700 mb-4">404</h1>
        <p className="text-slate-400 text-lg mb-2">Page not found</p>
        <p className="text-slate-600 text-sm mb-8">The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn-primary flex items-center gap-2 mx-auto">
          <MdArrowBack className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}
