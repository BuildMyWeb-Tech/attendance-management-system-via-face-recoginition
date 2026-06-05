const Location = require('../models/locationModel');

const createLocation = async (req, res) => {
  try {
    const { name, latitude, longitude, radius } = req.body;
    if (!name || latitude == null || longitude == null)
      return res.status(400).json({ success: false, message: 'name, latitude and longitude are required' });

    const existing = await Location.findOne({ name: name.trim() });
    if (existing)
      return res.status(409).json({ success: false, message: 'A location with this name already exists' });

    const location = await Location.create({
      name:      name.trim(),
      latitude:  parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius:    radius ? parseFloat(radius) : 5,
      createdBy: req.admin?.username || 'admin',
    });

    res.status(201).json({ success: true, message: 'Location created', location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, count: locations.length, locations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location)
      return res.status(404).json({ success: false, message: 'Location not found' });

    await Location.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { name, latitude, longitude, radius } = req.body;
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { name, latitude: parseFloat(latitude), longitude: parseFloat(longitude), radius: parseFloat(radius) },
      { new: true }
    );
    if (!location)
      return res.status(404).json({ success: false, message: 'Location not found' });

    res.json({ success: true, message: 'Location updated', location });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createLocation, getAllLocations, deleteLocation, updateLocation };