const router = require('express').Router();
const { markAttendance, getTodayAttendance, getAllAttendance, getDashboardStats } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/mark', markAttendance);
router.get('/today', protect, getTodayAttendance);
router.get('/all', protect, getAllAttendance);
router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
