#!/bin/bash
# Downloads required face-api.js models into client/public/models

MODELS_DIR="$(dirname "$0")/../client/public/models"
mkdir -p "$MODELS_DIR"

BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

echo "Downloading face-api.js models..."

FILES=(
  "tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector_model-shard1"
  "face_landmark_68_tiny_model-weights_manifest.json"
  "face_landmark_68_tiny_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
)

for file in "${FILES[@]}"; do
  echo "  → $file"
  curl -sL "$BASE_URL/$file" -o "$MODELS_DIR/$file"
done

echo "✅ Models downloaded to $MODELS_DIR"
