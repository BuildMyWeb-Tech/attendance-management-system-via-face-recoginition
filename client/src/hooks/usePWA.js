import { useState, useEffect } from 'react';

/**
 * usePWA
 * Tracks PWA install prompt + standalone mode detection
 *
 * Returns:
 *   canInstall   — true when browser has a pending beforeinstallprompt
 *   isInstalled  — true when running in standalone / installed mode
 *   isIOS        — true on iOS Safari (no beforeinstallprompt, needs manual instructions)
 *   install()    — triggers the native install prompt
 *   dismiss()    — hides the prompt without installing
 */
const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall]         = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);
  const [isIOS, setIsIOS]                   = useState(false);
  const [dismissed, setDismissed]           = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    // Detect iOS Safari
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Check if user already dismissed this session
    const wasDismissed = sessionStorage.getItem('pwa-dismissed') === 'true';
    setDismissed(wasDismissed);

    // Chrome / Edge / Android — capture the install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-dismissed', 'true');
  };

  return {
    canInstall: canInstall && !dismissed,
    isInstalled,
    isIOS,
    install,
    dismiss,
  };
};

export default usePWA;