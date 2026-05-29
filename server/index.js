const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const seedAdmin = require('./config/seed');
const { initSocket } = require('./sockets/socketHandler');

dotenv.config();
connectDB().then(() => seedAdmin());

const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173' ||   'https://attendance-management-system-via-fa-six.vercel.app',
   credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/face', require('./routes/faceRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
