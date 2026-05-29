#!/bin/bash
# setup.sh — Run once after cloning to get the project ready

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   FaceTrack — Setup Script               ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
echo "✅ Dependencies installed"
echo ""

# 2. Copy .env files if not present
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "📝 Created server/.env — EDIT THIS FILE with your MongoDB URI and JWT secret"
else
  echo "ℹ️  server/.env already exists"
fi

if [ ! -f client/.env ]; then
  cp client/.env.example client/.env
  echo "📝 Created client/.env"
else
  echo "ℹ️  client/.env already exists"
fi
echo ""

# 3. Download face-api.js models
echo "🤖 Downloading face recognition models..."
bash scripts/download-models.sh
echo ""

echo "╔══════════════════════════════════════════╗"
echo "║   Setup complete!                        ║"
echo "║                                          ║"
echo "║   1. Edit server/.env with your          ║"
echo "║      MONGO_URI and JWT_SECRET            ║"
echo "║                                          ║"
echo "║   2. Run: npm run dev                    ║"
echo "║                                          ║"
echo "║   3. Open: http://localhost:5173         ║"
echo "║      Login: admin / admin123             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
