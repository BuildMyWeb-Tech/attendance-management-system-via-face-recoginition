import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import toast, { Toaster } from 'react-hot-toast';
import { gatePunchAPI, locationAPI } from '../services/api';
import { loadFaceModels, detectAllFaces } from '../utils/faceUtils';
import {
  MdLocationOn, MdFaceRetouchingNatural, MdCameraAlt,
  MdCheckCircle, MdError, MdRefresh, MdSensors,
  MdGpsFixed, MdGpsNotFixed, MdWarning,
} from 'react-icons/md';

/*
  FLOW:
  idle → gps_check → location_valid / location_invalid
       → face_scan → face_verified / face_invalid
       → selfie → submitting → done / error
*/

const DETECT_INTERVAL = 220;
const STABLE_THRESHOLD = 6;

export default function GatePunchScanner() {
  const webcamRef    = useRef(null);
  const rafRef       = useRef(null);
  const stableRef    = useRef(0);
  const verifyingRef = useRef(false);

  const [step,          setStep]          = useState('idle');
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [cameraReady,   setCameraReady]   = useState(false);

  // GPS
  const [gpsStatus,     setGpsStatus]     = useState('');
  const [currentGPS,    setCurrentGPS]    = useState(null);
  const [validatedLoc,  setValidatedLoc]  = useState(null);

  // Face
  const [faceStatus,    setFaceStatus]    = useState('');
  const [scanProgress,  setScanProgress]  = useState(0);
  const [verifiedEmployee, setVerifiedEmployee] = useState(null);
  const [faceMatchScore,   setFaceMatchScore]   = useState(null);

  // Selfie
  const [selfieImage,   setSelfieImage]   = useState(null);

  // Result
  const [punchResult,   setPunchResult]   = useState(null);
  const [errorMsg,      setErrorMsg]      = useState('');

  // Load face models on mount
  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsLoaded(true))
      .catch(() => toast.error('Failed to load face models'));
  }, []);

  /* ── Stop rAF loop ── */
  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  /* ── Face detection rAF loop ── */
  const runFaceLoop = useCallback(() => {
    let lastRun = 0;
    const tick  = async (now) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - lastRun < DETECT_INTERVAL) return;
      lastRun = now;

      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4 || verifyingRef.current) return;

      try {
        const dets = await detectAllFaces(video);

        if (dets.length === 0) {
          stableRef.current = 0; setScanProgress(0);
          setFaceStatus('No face detected — look at the camera');
          return;
        }
        if (dets.length > 1) {
          stableRef.current = 0; setScanProgress(0);
          setFaceStatus('Multiple faces — one person at a time');
          return;
        }
        const score = dets[0].detection?.score ?? 1;
        if (score < 0.55) {
          stableRef.current = 0; setScanProgress(0);
          setFaceStatus('Move closer or improve lighting');
          return;
        }

        stableRef.current = Math.min(stableRef.current + 1, STABLE_THRESHOLD);
        const pct = Math.round((stableRef.current / STABLE_THRESHOLD) * 100);
        setScanProgress(pct);

        if (stableRef.current < STABLE_THRESHOLD) {
          setFaceStatus(`Hold still… ${pct}%`);
          return;
        }

        // Trigger verify
        stableRef.current = 0; setScanProgress(0);
        stopLoop();
        verifyingRef.current = true;
        setFaceStatus('Verifying identity…');
        await doFaceVerify(Array.from(dets[0].descriptor));
      } catch { /* ignore */ }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop]);

  useEffect(() => {
    if (step === 'face_scan' && modelsLoaded && cameraReady) {
      stableRef.current = 0;
      setScanProgress(0);
      setFaceStatus('Searching for face…');
      runFaceLoop();
    }
    return stopLoop;
  }, [step, modelsLoaded, cameraReady, runFaceLoop, stopLoop]);

  /* ─────────────── STEP 1: START PUNCH ─────────────── */
  const handleStart = () => {
    setStep('gps_check');
    setGpsStatus('Getting your location…');
    doGPSCheck();
  };

  /* ─────────────── STEP 2: GPS CHECK ─────────────── */
  const doGPSCheck = () => {
    if (!navigator.geolocation) {
      setErrorMsg('GPS is not supported on this device');
      setStep('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentGPS({ lat, lng });
        setGpsStatus(`GPS acquired (±${Math.round(pos.coords.accuracy)}m)`);

        try {
          const res = await gatePunchAPI.validateLocation(lat, lng);
          if (res.data.valid) {
            setValidatedLoc(res.data.location);
            setStep('face_scan');
            toast.success(`Location verified: ${res.data.location.name}`);
          } else {
            setErrorMsg(res.data.message);
            setStep('location_invalid');
          }
        } catch (err) {
          setErrorMsg(err.response?.data?.message || 'Location check failed');
          setStep('error');
        }
      },
      (err) => {
        const msgs = {
          1: 'GPS permission denied — please allow location access',
          2: 'GPS signal unavailable — try outdoors',
          3: 'GPS request timed out — try again',
        };
        setErrorMsg(msgs[err.code] || 'GPS error');
        setStep('location_invalid');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /* ─────────────── STEP 3: FACE VERIFY ─────────────── */
  const doFaceVerify = async (descriptor) => {
    try {
      const res = await gatePunchAPI.verifyFace(descriptor);
      verifyingRef.current = false;

      if (res.data.alreadyMarked) {
        setVerifiedEmployee(res.data.employee);
        setErrorMsg('Attendance Already Marked Today');
        setStep('already_marked');
        return;
      }
      if (res.data.matched) {
        setVerifiedEmployee(res.data.employee);
        setFaceMatchScore(res.data.faceMatchScore);
        setStep('selfie');
        toast.success('Face verified! Please take your selfie.');
      } else {
        setErrorMsg('Invalid Face Detected');
        setStep('face_invalid');
      }
    } catch (err) {
      verifyingRef.current = false;
      setErrorMsg(err.response?.data?.message || 'Face verification failed');
      setStep('error');
    }
  };

  /* ─────────────── STEP 4: SELFIE ─────────────── */
  const captureSelfie = () => {
    const img = webcamRef.current?.getScreenshot({ width: 640, height: 480 });
    if (!img) return toast.error('Camera not ready');
    setSelfieImage(img);
  };

  /* ─────────────── STEP 5: SUBMIT PUNCH ─────────────── */
  const submitPunch = async () => {
    if (!selfieImage) return toast.error('Please take a selfie first');
    setStep('submitting');

    try {
      // Convert base64 selfie to blob
      const blob = await (await fetch(selfieImage)).blob();
      const fd   = new FormData();
      fd.append('employeeId',     verifiedEmployee.employeeId);
      fd.append('employeeName',   verifiedEmployee.name);
      fd.append('department',     verifiedEmployee.department || 'General');
      fd.append('locationId',     validatedLoc._id);
      fd.append('locationName',   validatedLoc.name);
      fd.append('lat',            String(currentGPS.lat));
      fd.append('lng',            String(currentGPS.lng));
      fd.append('faceMatchScore', String(faceMatchScore ?? 0));
      fd.append('selfie',         blob, 'selfie.jpg');

      const res = await gatePunchAPI.punch(fd);
      setPunchResult(res.data.attendance);
      setStep('done');

      // Vibrate on success (mobile PWA)
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Punch failed — try again');
      setStep('error');
    }
  };

  /* ─────────────── RESET ─────────────── */
  const reset = () => {
    stopLoop();
    setStep('idle');
    setCurrentGPS(null);
    setValidatedLoc(null);
    setVerifiedEmployee(null);
    setFaceMatchScore(null);
    setSelfieImage(null);
    setPunchResult(null);
    setErrorMsg('');
    setGpsStatus('');
    setFaceStatus('');
    setScanProgress(0);
    stableRef.current   = 0;
    verifyingRef.current = false;
  };

  /* ─────────────── RENDER ─────────────── */
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
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
          <MdSensors className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">FaceTrack Gate</p>
          <p className="text-xs text-slate-500">Smart Attendance Punch</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5">

        {/* ════════ IDLE ════════ */}
        {step === 'idle' && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="w-24 h-24 bg-primary-900/40 rounded-full flex items-center justify-center mx-auto border-2 border-primary-600/40">
              <MdSensors className="w-12 h-12 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gate Punch</h1>
              <p className="text-slate-400 text-sm mt-2">
                Verify your GPS location and face to mark attendance
              </p>
            </div>

            <div className="card p-4 text-left space-y-3">
              {[
                { icon: MdGpsFixed,             color: 'text-emerald-400', text: 'GPS location verified (must be on-site)' },
                { icon: MdFaceRetouchingNatural, color: 'text-primary-400', text: 'Face recognition scan'                  },
                { icon: MdCameraAlt,             color: 'text-amber-400',  text: 'Selfie photo captured'                   },
                { icon: MdCheckCircle,           color: 'text-emerald-400', text: 'Attendance saved automatically'         },
              ].map(({ icon: Icon, color, text }, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {!modelsLoaded && (
              <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Loading face models…
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={!modelsLoaded}
              className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-3"
            >
              <MdSensors className="w-6 h-6" />
              Start Gate Punch
            </button>
          </div>
        )}

        {/* ════════ GPS CHECK ════════ */}
        {step === 'gps_check' && (
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
              <MdGpsNotFixed className="w-10 h-10 text-primary-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Checking Location</h2>
              <p className="text-slate-400 text-sm mt-2">{gpsStatus || 'Getting GPS coordinates…'}</p>
            </div>
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* ════════ LOCATION INVALID ════════ */}
        {step === 'location_invalid' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-red-700">
              <MdLocationOn className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-300">Invalid Location</h2>
              <p className="text-slate-400 text-sm mt-2">{errorMsg}</p>
              <p className="text-slate-500 text-xs mt-3">
                You must be within the designated site area to punch in.
              </p>
            </div>
            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Try Again
            </button>
          </div>
        )}

        {/* ════════ FACE SCAN ════════ */}
        {step === 'face_scan' && (
          <div className="w-full max-w-sm space-y-4">
            {/* Location badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 text-sm">
              <MdLocationOn className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{validatedLoc?.name}</span>
              <span className="text-emerald-600 text-xs ml-auto">{validatedLoc?.distance}m away</span>
            </div>

            {/* Camera */}
            <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                onUserMedia={() => setCameraReady(true)}
                onUserMediaError={() => toast.error('Camera access denied')}
                videoConstraints={{ facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Oval guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 64% 70% at 50% 46%, transparent 50%, rgba(0,0,0,0.65) 100%)' }}>
                <div
                  className="w-[60%] rounded-full transition-all duration-300"
                  style={{
                    aspectRatio: '3/4',
                    border: `3px solid ${scanProgress > 0 ? '#10b981' : '#3b5bdb'}80`,
                    boxShadow: `0 0 20px ${scanProgress > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(59,91,219,0.3)'}`,
                  }}
                />
              </div>

              {/* Progress bar */}
              {scanProgress > 0 && (
                <div className="absolute bottom-16 left-6 right-6">
                  <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status chip */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[90%]">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm bg-slate-900/85 border border-slate-700 text-slate-300">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse flex-shrink-0" />
                  {faceStatus || (!modelsLoaded ? 'Loading models…' : 'Scanning…')}
                </div>
              </div>
            </div>

            <p className="text-center text-slate-500 text-xs">
              Keep your face in the oval — system scans automatically
            </p>

            <button onClick={reset} className="btn-secondary w-full text-sm">Cancel</button>
          </div>
        )}

        {/* ════════ FACE INVALID ════════ */}
        {step === 'face_invalid' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-red-700">
              <MdError className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-300">Face Not Recognised</h2>
              <p className="text-slate-400 text-sm mt-2">
                Your face does not match any registered employee.
              </p>
            </div>
            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Try Again
            </button>
          </div>
        )}

        {/* ════════ ALREADY MARKED ════════ */}
        {step === 'already_marked' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-amber-700">
              <MdWarning className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-300">Already Marked</h2>
              <p className="text-slate-300 font-medium mt-2">{verifiedEmployee?.name}</p>
              <p className="text-slate-500 text-sm mt-1">
                Attendance already recorded for today.
              </p>
            </div>
            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Done
            </button>
          </div>
        )}

        {/* ════════ SELFIE ════════ */}
        {step === 'selfie' && (
          <div className="w-full max-w-sm space-y-4">
            {/* Verified badge */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-900/20 border border-emerald-800/40">
              <MdCheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-300">{verifiedEmployee?.name}</p>
                <p className="text-emerald-600 text-xs">
                  {verifiedEmployee?.employeeId} · {verifiedEmployee?.department}
                </p>
              </div>
            </div>

            <p className="text-center text-slate-300 text-sm font-medium">
              Face verified! Now take a selfie to complete punch-in.
            </p>

            {/* Camera or selfie preview */}
            <div
              className="relative bg-black rounded-2xl overflow-hidden border-2 border-slate-700"
              style={{ aspectRatio: '3/4' }}
            >
              {selfieImage ? (
                <img
                  src={selfieImage}
                  alt="Selfie"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  onUserMedia={() => setCameraReady(true)}
                  videoConstraints={{ facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}

              {selfieImage && (
                <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                  <div className="w-14 h-14 bg-emerald-900/80 rounded-full flex items-center justify-center border-2 border-emerald-500">
                    <MdCheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!selfieImage ? (
                <button
                  onClick={captureSelfie}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                >
                  <MdCameraAlt className="w-5 h-5" /> Take Selfie
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setSelfieImage(null)}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <MdRefresh className="w-4 h-4" /> Retake
                  </button>
                  <button
                    onClick={submitPunch}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
                  >
                    <MdCheckCircle className="w-5 h-5" /> Confirm Punch
                  </button>
                </>
              )}
            </div>

            <button onClick={reset} className="text-slate-500 hover:text-slate-300 text-sm w-full text-center">
              Cancel
            </button>
          </div>
        )}

        {/* ════════ SUBMITTING ════════ */}
        {step === 'submitting' && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-300 font-medium">Saving attendance…</p>
          </div>
        )}

        {/* ════════ DONE ════════ */}
        {step === 'done' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-24 h-24 bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-600">
              <MdCheckCircle className="w-14 h-14 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-300">Punch Successful!</h2>
              <p className="text-white font-semibold text-lg mt-2">{punchResult?.employeeName}</p>
              <p className="text-slate-400 text-sm">{punchResult?.employeeId}</p>
              <p className="text-slate-500 text-sm mt-1">{punchResult?.locationName}</p>
              <p className="text-emerald-400 font-semibold mt-2">{punchResult?.time} IST</p>
            </div>

            {selfieImage && (
              <img
                src={selfieImage}
                alt="Selfie"
                className="w-24 h-24 object-cover rounded-full border-4 border-emerald-600 mx-auto"
              />
            )}

            <div className="card p-4 text-sm text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Location</span>
                <span className="text-slate-200 font-medium">{punchResult?.locationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-200">{punchResult?.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={punchResult?.status === 'late' ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
                  {punchResult?.status}
                </span>
              </div>
            </div>

            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> New Punch
            </button>
          </div>
        )}

        {/* ════════ ERROR ════════ */}
        {step === 'error' && (
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-red-700">
              <MdError className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-300">Something went wrong</h2>
              <p className="text-slate-400 text-sm mt-2">{errorMsg}</p>
            </div>
            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <MdRefresh className="w-5 h-5" /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}