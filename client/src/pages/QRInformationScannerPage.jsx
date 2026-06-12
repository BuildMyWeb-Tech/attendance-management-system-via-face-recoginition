import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast, { Toaster } from 'react-hot-toast';
import {
  MdQrCodeScanner, MdCheckCircle, MdError, MdRefresh,
  MdUploadFile, MdLink, MdEmail, MdPhone, MdTextFields,
  MdDataObject, MdOpenInNew, MdClose,
} from 'react-icons/md';

const SCANNER_ID = 'qr-info-scanner-region';
const FILE_SCANNER_ID = 'qr-info-file-region';

/* ─── Detect content type from decoded string ─── */
const detectType = (text) => {
  const trimmed = text.trim();

  // Try JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      return { type: 'JSON', value: parsed, raw: trimmed };
    }
  } catch (_) { /* not JSON */ }

  // URL
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
    return { type: 'URL', value: trimmed, raw: trimmed };
  }

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { type: 'EMAIL', value: trimmed, raw: trimmed };
  }

  // Phone number — digits, spaces, +, -, (, ) only, 7+ digits
  const digitsOnly = trimmed.replace(/[\s\-()]/g, '');
  if (/^\+?\d{7,15}$/.test(digitsOnly)) {
    return { type: 'PHONE', value: trimmed, raw: trimmed };
  }

  // Plain text fallback
  return { type: 'TEXT', value: trimmed, raw: trimmed };
};

export default function QRInformationScannerPage() {
  const [step,        setStep]        = useState('scanning'); // scanning | result | invalid
  const [statusText,  setStatusText]  = useState('Initializing camera…');
  const [cameraError, setCameraError] = useState('');
  const [decoded,     setDecoded]     = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const scannerRef  = useRef(null);
  const fileScanRef = useRef(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef(null);

  /* ─── Start camera scanner ─── */
  const startScanner = useCallback(async () => {
    if (scanningRef.current) return;
    setCameraError('');
    setStatusText('Starting camera…');

    try {
      const html5QrCode = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = html5QrCode;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setCameraError('No camera found on this device');
        return;
      }

      const rearCamera = cameras.find(c => /back|rear|environment/i.test(c.label));
      const cameraId    = rearCamera ? rearCamera.id : cameras[0].id;

      await html5QrCode.start(
        { deviceId: { exact: cameraId } },
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0, disableFlip: false },
        onScanSuccess,
        () => { /* ignore per-frame errors */ }
      );

      scanningRef.current = true;
      setStatusText('Point camera at any QR code…');
    } catch (err) {
      if (/permission/i.test(err.toString())) {
        setCameraError('Camera permission denied — please allow camera access and refresh');
      } else {
        setCameraError('Camera error: ' + err.toString());
      }
    }
  }, []);

  /* ─── Stop camera scanner ─── */
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scanningRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) { /* ignore */ }
      scanningRef.current = false;
    }
  }, []);

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, [startScanner, stopScanner]);

  /* ─── On successful decode (camera or file) ─── */
  const onScanSuccess = async (decodedText) => {
    if (step !== 'scanning') return;
    await stopScanner();

    if (!decodedText || !decodedText.trim()) {
      setStep('invalid');
      return;
    }

    const result = detectType(decodedText);
    setDecoded(result);
    setStep('result');
  };

  const onScanFailure = () => {
    setStep('invalid');
  };

  /* ─── Handle image upload ─── */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      toast.error('Please upload a PNG, JPG, or JPEG image');
      return;
    }

    await stopScanner();
    setStatusText('Decoding uploaded image…');

    try {
      // Need a fresh Html5Qrcode instance for file scanning,
      // using a hidden div so it doesn't conflict with the camera region
      if (!fileScanRef.current) {
        fileScanRef.current = new Html5Qrcode(FILE_SCANNER_ID);
      }

      const decodedText = await fileScanRef.current.scanFile(file, false);

      if (!decodedText || !decodedText.trim()) {
        onScanFailure();
        return;
      }

      const result = detectType(decodedText);
      setDecoded(result);
      setStep('result');
    } catch (err) {
      onScanFailure();
    } finally {
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ─── Scan Again ─── */
  const handleScanAgain = async () => {
    setStep('scanning');
    setDecoded(null);
    setConfirmOpen(false);
    setCameraError('');
    setStatusText('Restarting camera…');
    await startScanner();
  };

  /* ─── Open link with confirmation ─── */
  const requestOpenLink = () => setConfirmOpen(true);
  const confirmOpenLink = () => {
    if (decoded?.value) {
      window.open(decoded.value, '_blank', 'noopener,noreferrer');
    }
    setConfirmOpen(false);
  };

  /* ─────────────────────────────────────────────
     RENDER HELPERS
  ───────────────────────────────────────────── */

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'URL':   return MdLink;
      case 'EMAIL': return MdEmail;
      case 'PHONE': return MdPhone;
      case 'JSON':  return MdDataObject;
      default:      return MdTextFields;
    }
  };

  const renderTypeLabel = (type) => {
    switch (type) {
      case 'URL':   return 'URL';
      case 'EMAIL': return 'Email';
      case 'PHONE': return 'Phone Number';
      case 'JSON':  return 'JSON Data';
      default:      return 'Plain Text';
    }
  };

  /* Renders JSON object as a clean key-value list */
  const renderJSON = (obj) => (
    <div className="space-y-2">
      {Object.entries(obj).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm">
          <span className="text-slate-500 capitalize flex-shrink-0">{key}:</span>
          <span className="text-slate-200 font-medium break-all">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */

  return (
    <div className="space-y-6 max-w-2xl">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
        }}
      />

      <div>
        <h1 className="text-2xl font-bold text-white">QR Information Scanner</h1>
        <p className="text-slate-400 text-sm mt-1">
          Scan any QR code — JSON, URLs, emails, phone numbers, or plain text
        </p>
      </div>

      {/* Hidden div used only for file-based scanning */}
      <div id={FILE_SCANNER_ID} style={{ display: 'none' }} />

      {/* ════ SCANNING ════ */}
      {step === 'scanning' && (
        <div className="space-y-4">
          {cameraError ? (
            <div className="card p-6 text-center space-y-4 border border-red-800/40 bg-red-900/10">
              <MdError className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-red-300 font-medium">Camera Error</p>
              <p className="text-slate-400 text-sm">{cameraError}</p>
              <p className="text-slate-500 text-xs">
                You can still upload a QR image below
              </p>
            </div>
          ) : (
            <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-slate-800 max-w-md mx-auto">
              <div id={SCANNER_ID} className="w-full" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[90%]">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm bg-slate-900/85 border border-slate-700 text-slate-300">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse flex-shrink-0" />
                  {statusText}
                </div>
              </div>
            </div>
          )}

          {/* Upload alternative */}
          <div className="card p-4 max-w-md mx-auto">
            <p className="text-slate-400 text-sm text-center mb-3">
              Or upload a QR code image
            </p>
            <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer text-sm py-2.5">
              <MdUploadFile className="w-4 h-4" />
              Upload QR Image
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* ════ RESULT ════ */}
      {step === 'result' && decoded && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="card p-6 border border-emerald-800/40 bg-emerald-900/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-900/60 rounded-xl flex items-center justify-center border border-emerald-700 flex-shrink-0">
                <MdCheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-emerald-300 text-sm">QR Successfully Decoded</p>
                <p className="text-slate-500 text-xs mt-0.5">Decoded Information</p>
              </div>
            </div>

            {/* Type badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm">
              {(() => {
                const Icon = renderTypeIcon(decoded.type);
                return <Icon className="w-4 h-4 text-violet-400 flex-shrink-0" />;
              })()}
              <span className="text-slate-500 text-xs">Type:</span>
              <span className="text-slate-200 font-medium">{renderTypeLabel(decoded.type)}</span>
            </div>

            {/* Content display */}
            {decoded.type === 'JSON' ? (
              renderJSON(decoded.value)
            ) : decoded.type === 'URL' ? (
              <div className="space-y-3">
                <div className="px-3 py-2 bg-slate-800 rounded-lg text-sm break-all">
                  <span className="text-slate-500 text-xs block mb-1">Value:</span>
                  <span className="text-slate-200 font-medium">{decoded.value}</span>
                </div>
                <button
                  onClick={requestOpenLink}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
                >
                  <MdOpenInNew className="w-4 h-4" /> Open Link
                </button>
              </div>
            ) : (
              <div className="px-3 py-2 bg-slate-800 rounded-lg text-sm break-all">
                <span className="text-slate-500 text-xs block mb-1">Value:</span>
                <span className="text-slate-200 font-medium whitespace-pre-wrap">{decoded.value}</span>
              </div>
            )}
          </div>

          <button onClick={handleScanAgain} className="btn-secondary w-full flex items-center justify-center gap-2">
            <MdRefresh className="w-5 h-5" /> Scan Again
          </button>
        </div>
      )}

      {/* ════ INVALID ════ */}
      {step === 'invalid' && (
        <div className="max-w-md mx-auto text-center space-y-5">
          <div className="card p-6 border border-red-800/40 bg-red-900/10 space-y-3">
            <div className="w-16 h-16 bg-red-900/40 rounded-full flex items-center justify-center mx-auto border-2 border-red-700">
              <MdError className="w-9 h-9 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-300">Invalid QR Code</h2>
              <p className="text-slate-400 text-sm mt-1">Unable to decode QR information.</p>
            </div>
          </div>
          <button onClick={handleScanAgain} className="btn-secondary w-full flex items-center justify-center gap-2">
            <MdRefresh className="w-5 h-5" /> Retry Scan
          </button>
        </div>
      )}

      {/* ════ CONFIRM OPEN LINK MODAL ════ */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-100">Open Link?</p>
              <button onClick={() => setConfirmOpen(false)} className="text-slate-500 hover:text-slate-300">
                <MdClose className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm break-all">
              Do you want to open this link?
            </p>
            <p className="text-violet-400 text-xs break-all bg-slate-800 px-3 py-2 rounded-lg">
              {decoded?.value}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="btn-secondary flex-1 text-sm">
                No
              </button>
              <button onClick={confirmOpenLink} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                <MdOpenInNew className="w-4 h-4" /> Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}