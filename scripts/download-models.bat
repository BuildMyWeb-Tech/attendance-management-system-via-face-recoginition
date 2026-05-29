@echo off
REM Downloads required face-api.js models into client/public/models

set MODELS_DIR=%~dp0..\client\public\models
if not exist "%MODELS_DIR%" mkdir "%MODELS_DIR%"

set BASE_URL=https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights

echo Downloading face-api.js models...

set FILES=tiny_face_detector_model-weights_manifest.json tiny_face_detector_model-shard1 face_landmark_68_tiny_model-weights_manifest.json face_landmark_68_tiny_model-shard1 face_recognition_model-weights_manifest.json face_recognition_model-shard1 face_recognition_model-shard2

for %%f in (%FILES%) do (
  echo   ^-^> %%f
  curl -sL "%BASE_URL%/%%f" -o "%MODELS_DIR%\%%f"
)

echo Done! Models saved to %MODELS_DIR%
pause
