const router = require('express').Router();
const {
  verifyEmployee,
  markQRAttendance,
  saveScanLog,
  getLogs,
  exportLogs,
} = require('../controllers/qrController');
const { protect } = require('../middleware/authMiddleware');

router.get('/verify/:employeeId',  verifyEmployee);        // public — scanner page
router.post('/mark-attendance',    markQRAttendance);       // public — scanner page
router.post('/log',                saveScanLog);            // public — scanner page
router.get('/logs',       protect, getLogs);                // admin only
router.get('/logs/export',protect, exportLogs);             // admin only

module.exports = router;