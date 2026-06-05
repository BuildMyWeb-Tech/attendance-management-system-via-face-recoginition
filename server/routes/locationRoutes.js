const router = require('express').Router();
const {
  createLocation, getAllLocations, deleteLocation, updateLocation
} = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/',         protect, createLocation);
router.get('/',                   getAllLocations);   // public — gate punch page needs this
router.put('/:id',       protect, updateLocation);
router.delete('/:id',    protect, deleteLocation);

module.exports = router;