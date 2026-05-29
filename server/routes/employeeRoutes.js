const router = require('express').Router();
const { registerEmployee, getAllEmployees, getEmployee, deleteEmployee } = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', protect, upload.array('faceImages', 10), registerEmployee);
router.get('/', protect, getAllEmployees);
router.get('/:id', protect, getEmployee);
router.delete('/:id', protect, deleteEmployee);

module.exports = router;
