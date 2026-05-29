import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';
import { employeeAPI } from '../services/api';
import { loadFaceModels, detectAllFaces } from '../utils/faceUtils';
import { MdCameraAlt, MdCheckCircle, MdError, MdPerson, MdBadge, MdBusiness } from 'react-icons/md';

const CAPTURE_STEPS = [
  { label: 'Look Straight', instruction: 'Face the camera directly', icon: '👁️' },
  { label: 'Turn Slightly Left', instruction: 'Turn your head slightly left', icon: '↙️' },
  { label: 'Turn Slightly Right', instruction: 'Turn your head slightly right', icon: '↘️' },
  { label: 'Tilt Up Slightly', instruction: 'Tilt your head slightly up', icon: '⬆️' },
  { label: 'Look Down Slightly', instruction: 'Tilt your head slightly down', icon: '⬇️' },
];

export default function RegistrationPage() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const [form, setForm] = useState({ name: '', employeeId: '', department: '' });
  const [step, setStep] = useState('form'); // form | capture | done
  const [captureStep, setCaptureStep] = useState(0);
  const [captures, setCaptures] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsLoaded(true))
      .catch(() => toast.error('Failed to load face models'));
  }, []);

  const startDetection = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;
      try {
        const detections = await detectAllFaces(video);
        if (detections.length === 1) {
          setFaceDetected(true);
          setStatus('Face detected — ready to capture');
        } else if (detections.length === 0) {
          setFaceDetected(false);
          setStatus('No face detected');
        } else {
          setFaceDetected(false);
          setStatus('Multiple faces detected — only one allowed');
        }
      } catch { setFaceDetected(false); }
    }, 500);
  }, []);

  const stopDetection = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => {
    if (step === 'capture' && modelsLoaded) startDetection();
    return stopDetection;
  }, [step, modelsLoaded, startDetection]);

  const handleCapture = async () => {
    const video = webcamRef.current?.video;
    if (!video) return;
    const detections = await detectAllFaces(video);
    if (detections.length !== 1) {
      toast.error(detections.length === 0 ? 'No face detected' : 'Multiple faces detected');
      return;
    }
    const descriptor = Array.from(detections[0].descriptor);
    const imageSrc = webcamRef.current.getScreenshot();
    const newCaptures = [...captures, { descriptor, image: imageSrc }];
    setCaptures(newCaptures);
    toast.success(`Capture ${newCaptures.length}/${CAPTURE_STEPS.length} done!`);
    if (newCaptures.length < CAPTURE_STEPS.length) {
      setCaptureStep(p => p + 1);
    } else {
      stopDetection();
      await submitRegistration(newCaptures);
    }
  };

  const submitRegistration = async (captureData) => {
    setLoading(true);
    setStatus('Saving employee data...');
    try {
      const descriptors = captureData.map(c => c.descriptor);
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('employeeId', form.employeeId);
      formData.append('department', form.department || 'General');
      formData.append('faceDescriptors', JSON.stringify(descriptors));
      captureData.forEach((c, i) => {
        const blob = dataURLtoBlob(c.image);
        if (blob) formData.append('faceImages', blob, `face_${i}.jpg`);
      });
      await employeeAPI.register(formData);
      setStep('done');
      toast.success('Employee registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
      setStep('capture');
    } finally {
      setLoading(false);
    }
  };

  const dataURLtoBlob = (dataURL) => {
    try {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
      return new Blob([u8arr], { type: mime });
    } catch { return null; }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.employeeId.trim()) return toast.error('Name and Employee ID required');
    if (!modelsLoaded) return toast.error('Face models still loading, please wait');
    setStep('capture');
    setCaptureStep(0);
    setCaptures([]);
  };

  const reset = () => {
    setStep('form');
    setForm({ name: '', employeeId: '', department: '' });
    setCaptures([]);
    setCaptureStep(0);
    stopDetection();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Register Employee</h1>
        {/* <p className="text-slate-400 text-sm mt-1">Capture face images for attendance recognition</p> */}
      </div>

      {step === 'form' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-slate-200">Employee Information</h2>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name *</label>
              <div className="relative">
                <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field pl-10" placeholder="John Smith" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Employee ID *</label>
              <div className="relative">
                <MdBadge className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                  className="input-field pl-10" placeholder="EMP-001" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Department</label>
              <div className="relative">
                <MdBusiness className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  className="input-field pl-10 appearance-none">
                  <option value="">Select Department</option>
                  {['Site Supervisor', 'Electrician', 'Plumber', 'Labour', 'Safety Officer', 'Engineer', 'General'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {!modelsLoaded && (
              <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg text-amber-400 text-sm">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Loading face detection models...
              </div>
            )}

            <button type="submit" disabled={!modelsLoaded} className="btn-primary w-full flex items-center justify-center gap-2">
              <MdCameraAlt className="w-5 h-5" /> Start Face Capture
            </button>
          </form>
        </div>
      )}

      {step === 'capture' && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Capture Progress</span>
              <span className="text-sm font-medium text-slate-200">{captures.length} / {CAPTURE_STEPS.length}</span>
            </div>
            <div className="flex gap-2">
              {CAPTURE_STEPS.map((s, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full transition-all ${i < captures.length ? 'bg-emerald-500' : i === captureStep ? 'bg-primary-500' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>

          {/* Instruction */}
          <div className="card p-4 flex items-center gap-3 border border-primary-800/40 bg-primary-900/10">
            <span className="text-2xl">{CAPTURE_STEPS[captureStep]?.icon}</span>
            <div>
              <p className="font-semibold text-primary-300">{CAPTURE_STEPS[captureStep]?.label}</p>
              <p className="text-slate-400 text-sm">{CAPTURE_STEPS[captureStep]?.instruction}</p>
            </div>
          </div>

          {/* Camera */}
          <div className="card overflow-hidden">
            <div className="relative bg-black">
              <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" width="100%"
                className="w-full" videoConstraints={{ facingMode: 'user', width: 640, height: 480 }} />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {/* Face ring overlay */}
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
                <div className={`w-48 h-56 border-4 rounded-full ${faceDetected ? 'border-emerald-500 face-overlay-ring' : 'border-slate-600'}`} />
              </div>
              {/* Status overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm backdrop-blur-sm ${faceDetected ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700' : 'bg-slate-900/80 text-slate-400 border border-slate-700'}`}>
                  <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  {status || 'Initializing camera...'}
                </div>
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <button onClick={handleCapture} disabled={!faceDetected || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <MdCameraAlt className="w-5 h-5" />
                {loading ? 'Processing...' : `Capture (${captures.length + 1}/${CAPTURE_STEPS.length})`}
              </button>
              <button onClick={reset} className="btn-secondary">Cancel</button>
            </div>
          </div>

          {/* Captured thumbnails */}
          {captures.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {captures.map((c, i) => (
                <div key={i} className="relative">
                  <img src={c.image} alt={`Capture ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border-2 border-emerald-600" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <MdCheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="card p-8 text-center success-glow border border-emerald-800/30">
          <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MdCheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-emerald-300 mb-2">Face Registered Successfully!</h2>
          <p className="text-slate-400 mb-1"><span className="text-slate-200 font-medium">{form.name}</span></p>
          <p className="text-slate-500 text-sm mb-6">ID: {form.employeeId} · {captures.length} face angles captured</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-primary">Register Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
