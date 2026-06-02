import { useState } from 'react';
import { MdDownload, MdPhoneIphone, MdCheck } from 'react-icons/md';
import usePWA from '../../hooks/usePWA';
import PWAInstallModal from './PWAInstallModal';

/**
 * PWAInstallButton
 *
 * variant="icon"    — small icon-only button (for navbar / sidebar)
 * variant="full"    — full button with text (for sidebar bottom)
 * variant="banner"  — wide banner strip (for dashboard top)
 */
export default function PWAInstallButton({ variant = 'icon', className = '' }) {
  const { canInstall, isInstalled, isIOS, install, dismiss } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Nothing to show if already installed and not iOS
  if (isInstalled && !isIOS) return null;

  // Hide if not installable and not iOS
  if (!canInstall && !isIOS) return null;

  const handleClick = () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      install();
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          title="Install App"
          className={`p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-primary-400 transition-all relative ${className}`}
        >
          {isInstalled ? (
            <MdCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <>
              <MdDownload className="w-5 h-5" />
              {/* Pulse dot indicating installable */}
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
            </>
          )}
        </button>
        {showIOSModal && <PWAInstallModal onClose={() => setShowIOSModal(false)} />}
      </>
    );
  }

  if (variant === 'full') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-primary-400 hover:bg-primary-900/20 rounded-xl transition-all text-sm ${className}`}
        >
          <MdDownload className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1 min-w-0">
            <span className="block font-medium">Install App</span>
            <span className="block text-xs text-slate-500 truncate">Add to Home Screen</span>
          </div>
          <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse flex-shrink-0" />
        </button>
        {showIOSModal && <PWAInstallModal onClose={() => setShowIOSModal(false)} />}
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className="card border border-primary-800/40 bg-primary-900/10 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-900/60 rounded-xl flex items-center justify-center flex-shrink-0">
            <MdPhoneIphone className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200">Install FaceTrack</p>
            <p className="text-xs text-slate-500 mt-0.5">Use as a native app — works offline</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleClick}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <MdDownload className="w-4 h-4" /> Install
            </button>
            <button
              onClick={dismiss}
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
        {showIOSModal && <PWAInstallModal onClose={() => setShowIOSModal(false)} />}
      </>
    );
  }

  return null;
}