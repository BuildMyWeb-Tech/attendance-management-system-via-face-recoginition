# 🏗️ FaceTrack — Construction Company Face Attendance System

A demo-level MERN Stack Face Attendance Management System with real-time face recognition and automatic attendance marking.

---

## 📸 Features

- **Face Registration** — Capture 5 face angles per employee with live webcam
- **Face Recognition** — Real-time face matching using face-api.js (TinyFaceDetector)
- **Auto Attendance** — Marks attendance automatically on face match
- **Duplicate Prevention** — One attendance per employee per day
- **Live Dashboard** — Real-time updates via Socket.io
- **JWT Auth** — Protected admin routes
- **Responsive UI** — Mobile, tablet, and desktop support

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, face-api.js |
| Backend | Node.js, Express.js, MongoDB Atlas |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Modern browser with webcam

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/face-attendance.git
cd face-attendance
npm run install:all
```

### 2. Download Face Models

```bash
# Linux/Mac
bash scripts/download-models.sh

# Windows
scripts\download-models.bat
```

This downloads TinyFaceDetector, FaceLandmark68Tiny, and FaceRecognition models into `client/public/models/`.

### 3. Configure Environment

**Backend** (`server/.env`):
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/face-attendance?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

**Frontend** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Default Login
- Username: `admin`
- Password: `admin123`

---

## 📁 Folder Structure

```
face-attendance/
├── client/                     # React frontend
│   ├── public/
│   │   └── models/             # face-api.js model files (download separately)
│   └── src/
│       ├── components/layout/  # Sidebar, Layout
│       ├── context/            # AuthContext
│       ├── pages/              # Login, Dashboard, Registration, Verification, Attendance
│       ├── services/           # Axios API calls
│       ├── socket/             # Socket.io client
│       └── utils/              # Face detection utilities
│
├── server/                     # Node.js backend
│   ├── config/                 # DB config, seed
│   ├── controllers/            # Auth, Employee, Face, Attendance
│   ├── middleware/             # JWT auth, Multer upload
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routers
│   └── sockets/                # Socket.io handlers
│
└── scripts/                    # Model download scripts
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Get current admin |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/employees/register` | Register employee with face |
| GET | `/api/employees` | List all employees |
| GET | `/api/employees/:id` | Get employee by ID |
| DELETE | `/api/employees/:id` | Delete employee |

### Face Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/face/verify` | Verify face & mark attendance |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance/dashboard` | Dashboard stats |
| GET | `/api/attendance/today` | Today's attendance |
| GET | `/api/attendance/all` | All records (with filters) |

---

## 🌐 Deployment

### Frontend → Vercel

1. Push `client/` to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Set environment variables:
   - `VITE_API_URL` = your Render backend URL
   - `VITE_SOCKET_URL` = your Render backend URL
4. Build: `npm run build` | Output: `dist`

### Backend → Render

1. Push `server/` to GitHub
2. Create Web Service on [render.com](https://render.com)
3. Set environment variables (see `.env.example`)
4. Build: `npm install` | Start: `npm start`

---

## 🎯 Face Recognition Details

- **Library**: face-api.js
- **Models**: TinyFaceDetector + FaceLandmark68Tiny + FaceRecognitionNet
- **Threshold**: Euclidean distance < 0.5 = match
- **Registration**: 5 face angles averaged into one descriptor
- **Auto-scan**: Progressive confidence scan (0→100%) before triggering

---

## ⚠️ Important Notes

1. **face-api.js models** must be downloaded separately — they're not in the repo (~7MB total)
2. **HTTPS required** for camera access in production
3. **MongoDB Atlas** — whitelist `0.0.0.0/0` for Render deployment
4. This is a **demo project** — not production-grade face recognition

---

## 🔮 Future Scope

- Liveness detection (blink/head movement)
- GPS location tagging
- Shift management
- Payroll integration
- Mobile app (React Native)
- AI anti-spoofing

---

## 📄 License

MIT
