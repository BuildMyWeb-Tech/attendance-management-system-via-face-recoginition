const router       = require('express').Router();
const selfieUpload = require('../middleware/selfieUpload');
const {
  validateLocation, verifyFace, gatePunch, getGatePunchLogs
} = require('../controllers/gatePunchController');
const { protect } = require('../middleware/authMiddleware');

router.post('/validate-location', validateLocation);         // public
router.post('/verify-face',       verifyFace);               // public
router.post('/punch',             selfieUpload.single('selfie'), gatePunch); // public
router.get('/logs',               protect, getGatePunchLogs); // admin only

module.exports = router;