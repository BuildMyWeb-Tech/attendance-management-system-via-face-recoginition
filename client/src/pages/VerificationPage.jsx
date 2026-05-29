import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { faceAPI } from '../services/api';
import { loadFaceModels, detectAllFaces } from '../utils/faceUtils';
import { MdFaceRetouchingNatural, MdCheckCircle, MdError, MdCamera, MdRefresh } from 'react-icons/md';

export default function VerificationPage() {
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [autoScan, setAutoScan] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsLoaded(true))
      .catch(() => toast.error('Failed to load face models'));
  }, []);

  const startAutoScan = useCallback(() => {
    if (!modelsLoaded || intervalRef.current) return;
    let progress = 0;
    intervalRef.current = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;
      try {
        const detections = await detectAllFaces(video);
        setFaceCount(detections.length);
        if (detections.length === 1) {
          setScanStatus('Face locked — scanning...');
          progress = Math.min(progress + 8, 100);
          setScanProgress(progress);
          if (progress >= 100) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            await runVerification(Array.from(detections[0].descriptor));
          }
        } else {
          progress = 0;
          setScanProgress(0);
          setScanStatus(detections.length === 0 ? 'No face detected' : 'Multiple faces — please use one at a time');
        }
      } catch { setScanStatus('Detection error'); }
    }, 200);
  }, [modelsLoaded]);

  const stopAutoScan = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setScanProgress(0);
  };

  useEffect(() => {
    if (autoScan && cameraReady && modelsLoaded) startAutoScan();
    else stopAutoScan();
    return stopAutoScan;
  }, [autoScan, cameraReady, modelsLoaded, startAutoScan]);

  const runVerification = async (descriptor) => {
    setVerifying(true);
    setAutoScan(false);
    stopAutoScan();
    try {
      const res = await faceAPI.verify(descriptor);
      setResult(res.data);
      if (res.data.matched && !res.data.alreadyMarked) {
        toast.success('Attendance Marked Successfully!');
      } else if (res.data.alreadyMarked) {
        toast(res.data.message, { icon: 'ℹ️' });
      } else {
        toast.error('Invalid Face Detected');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setResult({ success: false, matched: false, message: 'Verification error' });
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async () => {
    const video = webcamRef.current?.video;
    if (!video) return;
    const detections = await detectAllFaces(video);
    if (detections.length === 0) return toast.error('No face detected');
    if (detections.length > 1) return toast.error('Multiple faces detected');
    await runVerification(Array.from(detections[0].descriptor));
  };

  const reset = () => {
    setResult(null);
    setScanProgress(0);
    setScanStatus('');
    setFaceCount(0);
  };

  const ringColor = () => {
    if (result) return result.matched ? 'border-emerald-500' : 'border-red-500';
    if (faceCount === 1) return 'border-primary-500';
    return 'border-slate-600';
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Face Verification</h1>
        <p className="text-slate-400 text-sm mt-1">Scan face to mark attendance automatically</p>
      </div>

      {/* Camera */}
      <div className="card overflow-hidden">
        <div className="relative bg-black min-h-[300px]">
          <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" width="100%"
            className="w-full" onUserMedia={() => setCameraReady(true)}
            onUserMediaError={() => toast.error('Camera access denied')}
            videoConstraints={{ facingMode: 'user', width: 640, height: 480 }} />

          {/* Face overlay ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-52 h-60 border-4 rounded-full transition-all duration-300 ${ringColor()} ${faceCount === 1 && !result ? 'face-overlay-ring' : ''}`}>
              {/* Scan line */}
              {autoScan && faceCount === 1 && !result && (
                <div className="relative h-full overflow-hidden rounded-full">
                  <div className="scan-line absolute w-full h-1 bg-primary-400/60" style={{ top: '0' }} />
                </div>
              )}
            </div>
          </div>

          {/* Scan progress */}
          {autoScan && faceCount === 1 && !result && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all duration-200 rounded-full" style={{ width: `${scanProgress}%` }} />
              </div>
            </div>
          )}

          {/* Status bar */}
          {!result && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm backdrop-blur-sm border ${
                faceCount === 1 ? 'bg-primary-900/80 text-primary-300 border-primary-700' : 'bg-slate-900/80 text-slate-400 border-slate-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${faceCount === 1 ? 'bg-primary-400 animate-pulse' : 'bg-slate-600'}`} />
                {scanStatus || (!modelsLoaded ? 'Loading models...' : 'Position face in frame')}
              </div>
            </div>
          )}

          {/* Result overlay */}
          {result && (
            <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm ${result.matched ? 'bg-emerald-950/70' : 'bg-red-950/70'}`}>
              <div className={`text-center p-6 rounded-2xl border ${result.matched ? 'border-emerald-700 bg-emerald-950/80 success-glow' : 'border-red-700 bg-red-950/80 error-glow'}`}>
                {result.matched ? (
                  <MdCheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                ) : (
                  <MdError className="w-16 h-16 text-red-400 mx-auto mb-3" />
                )}
                <p className={`text-xl font-bold mb-1 ${result.matched ? 'text-emerald-300' : 'text-red-300'}`}>{result.message}</p>
                {result.matched && result.employee && (
                  <div className="mt-3">
                    <p className="text-white font-medium text-lg">{result.employee.name}</p>
                    <p className="text-slate-400 text-sm">{result.employee.employeeId} · {result.employee.department}</p>
                    {!result.alreadyMarked && result.attendance && (
                      <p className="text-emerald-400 text-sm mt-1">{result.attendance.time}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {!result ? (
            <div className="flex gap-3">
              <button
                onClick={() => setAutoScan(!autoScan)}
                disabled={!modelsLoaded || !cameraReady}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${autoScan ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'btn-primary'}`}
              >
                {autoScan ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Stop Auto Scan</>
                ) : (
                  <><MdFaceRetouchingNatural className="w-5 h-5" /> Start Auto Scan</>
                )}
              </button>
              <button onClick={handleManualVerify} disabled={!modelsLoaded || !cameraReady || verifying}
                className="btn-secondary flex items-center gap-2">
                <MdCamera className="w-5 h-5" />
                {verifying ? 'Verifying...' : 'Manual'}
              </button>
            </div>
          ) : (
            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Scan Next Employee
            </button>
          )}

          {!modelsLoaded && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              Loading face detection models...
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card p-4 bg-slate-900/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">How to use</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
          {['Position your face inside the oval ring', 'Click Auto Scan for hands-free detection', 'Attendance is marked automatically on match'].map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 bg-primary-900/50 text-primary-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
