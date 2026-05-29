const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  employeeId: { type: String, required: true, unique: true, trim: true },
  department: { type: String, default: 'General' },
  faceDescriptors: { type: [[Number]], required: true },
  faceImages: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
