import { MdDownload, MdClose, MdPhoneIphone, MdShare } from 'react-icons/md';

/**
 * PWAInstallModal
 * Shown for iOS users (no native prompt available) — gives manual instructions
 */
export default function PWAInstallModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <MdPhoneIphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm">Install FaceTrack</p>
              <p className="text-xs text-slate-500">Add to Home Screen</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-slate-400 text-sm">To install FaceTrack on your iPhone / iPad:</p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-900/60 text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <div className="text-sm text-slate-300">
                Tap the <span className="inline-flex items-center gap-1 text-primary-400 font-medium"><MdShare className="w-4 h-4" /> Share</span> button at the bottom of Safari
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-900/60 text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <p className="text-sm text-slate-300">Scroll down and tap <span className="text-primary-400 font-medium">"Add to Home Screen"</span></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-900/60 text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <p className="text-sm text-slate-300">Tap <span className="text-primary-400 font-medium">"Add"</span> in the top-right corner</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 pt-1">The app will appear on your home screen like a native app.</p>
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="btn-primary w-full text-sm">Got it</button>
        </div>
      </div>
    </div>
  );
}