const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius:    { type: Number, default: 5 },   // meters, admin-configurable
  isActive:  { type: Boolean, default: true },
  createdBy: { type: String, default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('Location', locationSchema);