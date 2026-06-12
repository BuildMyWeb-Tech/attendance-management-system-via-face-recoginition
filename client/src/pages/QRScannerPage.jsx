import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { qrAPI } from '../services/api';
import {
  MdQrCodeScanner, MdCheckCircle, MdError, MdRefresh,
  MdPerson, MdBadge, MdBusiness, MdAccessTime, MdWarning,
} from 'react-icons/md';

const SCANNER_ID = 'qr-scanner-region';

// Read admin name from localStorage token (best-effort)
const getAdminName = () => {
  try {
    const token   = localStorage.getItem('token');
    if (!token) return 'admin';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.name || payload.username || 'admin';
  } catch { return 'admin'; }
};

export default function QRScannerPage() {
  const [step,          setStep]          = useState('scanning'); // scanning | success | invalid | already | error
  const [statusText,    setStatusText]    = useState('Initializing camera…');
  const [scannedData,   setScannedData]   = useState(null);
  const [employee,      setEmployee]      = useState(null);
  const [attendanceInfo, setAttendanceInfo] = useState(null);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [marking,       setMarking]       = useState(false);
  const [cameraError,   setCameraError]   = useState('');

  const scannerRef   = useRef(null);
  const scanningRef  = useRef(false);
  const adminName    = useRef(getAdminName());

  /* ─── Start scanner ─── */
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

      // Prefer rear camera on mobile
      const rearCamera = cameras.find(c =>
        /back|rear|environment/i.test(c.label)
      );
      const cameraId = rearCamera ? rearCamera.id : cameras[0].id;

      await html5QrCode.start(
        { deviceId: { exact: cameraId } },
        {
          fps:            10,
          qrbox:          { width: 260, height: 260 },
          aspectRatio:    1.0,
          disableFlip:    false,
        },
        onScanSuccess,
        (errorMsg) => {
          // Ignore per-frame errors — normal during scanning
        }
      );

      scanningRef.current = true;
      setStatusText('Point camera at QR code…');
    } catch (err) {
      if (/permission/i.test(err.toString())) {
        setCameraError('Camera permission denied — please allow camera access and refresh');
      } else {
        setCameraError('Camera error: ' + err.toString());
      }
    }
  }, []);

  /* ─── Stop scanner ─── */
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

  /* ─── On QR decoded ─── */
  const onScanSuccess = async (decodedText) => {
    if (!scanningRef.current) return;
    await stopScanner();
    setStatusText('QR decoded — verifying…');

    let parsed = null;
    try {
      parsed = JSON.parse(decodedText);
    } catch {
      // Invalid JSON QR
      setStep('invalid');
      setErrorMsg('Invalid QR code format');
      await saveFailedLog('', '', decodedText, 'Invalid QR format');
      return;
    }

    const employeeId = parsed.employeeId || parsed.employeeCode;
    if (!employeeId) {
      setStep('invalid');
      setErrorMsg('QR code does not contain a valid employee ID');
      await saveFailedLog('', '', decodedText, 'Missing employeeId in QR');
      return;
    }

    setScannedData(parsed);

    try {
      const res = await qrAPI.verifyEmployee(employeeId);
      if (res.data.success) {
        setEmployee(res.data.employee);
        if (res.data.alreadyMarked) {
          setStep('already');
          setAttendanceInfo({ time: res.data.markedTime, type: res.data.markedType });
        } else {
          setStep('success');
          setStatusText('Employee verified — ready to mark attendance');
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setStep('invalid');
        setErrorMsg('Employee not found in the system');
        await saveFailedLog(employeeId, parsed.employeeName || '', decodedText, 'Employee not found');
      } else {
        setStep('error');
        setErrorMsg(err.response?.data?.message || 'Verification failed');
      }
    }
  };

  /* ─── Save failed log ─── */
  const saveFailedLog = async (employeeId, employeeName, qrPayload, failReason) => {
    try {
      await qrAPI.saveLog({
        employeeId:   employeeId   || 'unknown',
        employeeCode: employeeId   || 'unknown',
        employeeName: employeeName || 'Unknown',
        qrPayload,
        status:    'FAILED',
        failReason,
        scannedBy: adminName.current,
      });
    } catch (_) { /* log save is best-effort */ }
  };

  /* ─── Mark attendance ─── */
  const handleMarkAttendance = async () => {
    if (!employee || !scannedData) return;
    setMarking(true);
    try {
      const res = await qrAPI.markAttendance({
        employeeId: employee.employeeId,
        qrPayload:  JSON.stringify(scannedData),
        scannedBy:  adminName.current,
      });

      if (res.data.alreadyMarked) {
        setStep('already');
        setAttendanceInfo({ time: res.data.markedTime, type: res.data.markedType });
      } else if (res.data.success) {
        setAttendanceInfo({ time: res.data.attendance?.time, type: 'QR' });
        setStep('marked');
        toast.success('QR Attendance Marked Successfully!');
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setStep('already');
        setAttendanceInfo({ time: err.response.data.markedTime, type: err.response.data.markedType });
      } else {
        toast.error(err.response?.data?.message || 'Failed to mark attendance');
      }
    } finally {
      setMarking(false);
    }
  };

  /* ─── Scan again ─── */
  const handleScanAgain = async () => {
    setStep('scanning');
    setScannedData(null);
    setEmployee(null);
    setAttendanceInfo(null);
    setErrorMsg('');
    setCameraError('');
    setStatusText('Restarting camera…');
    await startScanner();
  };

  /* ─── RENDER ─── */
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#10b981', secondary: '#1e293b' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800 bg-slate-900">
        <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
          <MdQrCodeScanner className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">FaceTrack QR</p>
          <p className="text-xs text-slate-500">QR Attendance Scanner</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5">

        {/* ════ SCANNING ════ */}
        {step === 'scanning' && (
          <div className="w-full max-w-sm space-y-4">
            {cameraError ? (
              <div className="card p-6 text-center space-y-4 border border-red-800/40 bg-red-900/10">
                <MdError className="w-12 h-12 text-red-400 mx-auto" />
                <p className="text-red-300 font-medium">Camera Error</p>
                <p className="text-slate-400 text-sm">{cameraError}</p>
                <button onClick={handleScanAgain} className="btn-secondary w-full flex items-center justify-center gap-2">
                  <MdRefresh className="w-4 h-4" /> Retry
                </button>
              </div>
            ) : (
              <>
                {/* Scanner container */}
                <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-slate-800">
                  <div id={SCANNER_ID} className="w-full" />
                  {/* Status chip */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[90%]">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm bg-slate-900/85 border border-slate-700 text-slate-300">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse flex-shrink-0" />
                      {statusText}
                    </div>
                  </div>
                </div>
                <p className="text-center text-slate-500 text-xs">
                  Point the camera at an employee QR code
                </p>
              </>
            )}
          </div>
        )}

        {/* ════ SUCCESS — verified, not yet marked ════ */}
        {step === 'success' && employee && (
          <div className="w-full max-w-sm space-y-4">
            <div className="card p-6 border border-emerald-800/40 bg-emerald-900/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-900/60 rounded-xl flex items-center justify-center border border-emerald-700">
                  <MdCheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-300 text-sm">Employee Verified</p>
                  <p className="text-slate-500 text-xs mt-0.5">Ready to mark attendance</p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { icon: MdPerson,   label: 'Name',       value: employee.name           },
                  { icon: MdBadge,    label: 'ID',         value: employee.employeeId      },
                  { icon: MdBusiness, label: 'Department', value: employee.department || 'General' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm">
                    <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-500 text-xs">{label}:</span>
                    <span className="text-slate-200 font-medium truncate">{value}</span>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 bg-emerald-900/30 rounded-lg border border-emerald-800/30">
                <p className="text-emerald-400 text-xs font-medium">
                  ✓ Status: Verified — attendance not yet marked
                </p>
              </div>
            </div>

            <button
              onClick={handleMarkAttendance}
              disabled={marking}
              className="btn-primary w-full py-3.5 text-base font-bold flex items-center justify-center gap-2"
            >
              {marking
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Marking…</>
                : <><MdCheckCircle className="w-5 h-5" /> Mark Attendance</>}
            </button>
            <button onClick={handleScanAgain} className="btn-secondary w-full text-sm">
              Cancel — Scan Again
            </button>
          </div>
        )}

        {/* ════ MARKED — attendance saved ════ */}
        {step === 'marked' && employee && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-24 h-24 bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-600">
              <MdCheckCircle className="w-14 h-14 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-300">Attendance Marked!</h2>
              <p className="text-white font-semibold text-lg mt-2">{employee.name}</p>
              <p className="text-slate-400 text-sm">{employee.employeeId}</p>
              <p className="text-slate-500 text-sm mt-0.5">{employee.department || 'General'}</p>
              {attendanceInfo?.time && (
                <p className="text-emerald-400 font-semibold mt-2">
                  {attendanceInfo.time} IST
                </p>
              )}
            </div>
            <div className="card p-4 text-sm text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="text-violet-400 font-medium">QR Attendance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scanned by</span>
                <span className="text-slate-300">{adminName.current}</span>
              </div>
            </div>
            <button onClick={handleScanAgain} className="btn-primary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Scan Next Employee
            </button>
          </div>
        )}

        {/* ════ ALREADY MARKED ════ */}
        {step === 'already' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-amber-700">
              <MdWarning className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-300">Already Marked</h2>
              {employee && (
                <p className="text-slate-300 font-medium mt-2">{employee.name}</p>
              )}
              <p className="text-slate-500 text-sm mt-1">
                Attendance already recorded today
              </p>
              {attendanceInfo?.time && (
                <p className="text-amber-400 text-sm mt-1">
                  Marked at: {attendanceInfo.time}
                  {attendanceInfo.type && ' via ' + attendanceInfo.type}
                </p>
              )}
            </div>
            <button onClick={handleScanAgain} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Scan Again
            </button>
          </div>
        )}

        {/* ════ INVALID QR ════ */}
        {step === 'invalid' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-red-700">
              <MdError className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-300">Invalid QR Code</h2>
              <p className="text-slate-400 text-sm mt-2">{errorMsg}</p>
            </div>
            <button onClick={handleScanAgain} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Scan Again
            </button>
          </div>
        )}

        {/* ════ ERROR ════ */}
        {step === 'error' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-red-700">
              <MdError className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-300">Something Went Wrong</h2>
              <p className="text-slate-400 text-sm mt-2">{errorMsg}</p>
            </div>
            <button onClick={handleScanAgain} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}