import { MdWarning } from 'react-icons/md';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card p-6 w-full max-w-sm shadow-2xl border border-slate-700">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-900/40' : 'bg-amber-900/40'}`}>
            <MdWarning className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{title}</h3>
            <p className="text-slate-400 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger text-sm px-4 py-2' : 'btn-primary text-sm px-4 py-2'}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
