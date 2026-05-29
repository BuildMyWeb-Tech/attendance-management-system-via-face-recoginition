import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadFaceModels = async () => {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
};

export const detectFace = async (videoEl) => {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const detection = await faceapi
    .detectSingleFace(videoEl, options)
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return detection;
};

export const detectAllFaces = async (videoEl) => {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const detections = await faceapi
    .detectAllFaces(videoEl, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();
  return detections;
};

export const drawDetections = (canvas, videoEl, detections) => {
  const dims = faceapi.matchDimensions(canvas, videoEl, true);
  const resized = faceapi.resizeResults(detections, dims);
  faceapi.draw.drawDetections(canvas, resized);
  faceapi.draw.drawFaceLandmarks(canvas, resized);
};

export const euclideanDistance = (d1, d2) => {
  return Math.sqrt(d1.reduce((sum, v, i) => sum + Math.pow(v - d2[i], 2), 0));
};

export { faceapi };
