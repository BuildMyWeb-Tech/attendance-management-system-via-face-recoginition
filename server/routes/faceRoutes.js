const router = require('express').Router();
const { verifyFace } = require('../controllers/faceController');

router.post('/verify', verifyFace);

module.exports = router;
