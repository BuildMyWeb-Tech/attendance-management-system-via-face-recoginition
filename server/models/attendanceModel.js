const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId:     { type: String, required: true },
  employeeName:   { type: String, required: true },
  department:     { type: String, default: 'General' },
  date:           { type: String, required: true },
  time:           { type: String, required: true },
  status:         { type: String, enum: ['present', 'absent', 'late'], default: 'present' },

  // Attendance type — FACE | QR | GATE | normal
  attendanceType: { type: String, enum: ['FACE', 'QR', 'GATE', 'normal'], default: 'normal' },

  // Gate Punch fields
  punchType:      { type: String, enum: ['normal', 'gate'], default: 'normal' },
  locationId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  locationName:   { type: String, default: null },
  gps: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  faceMatchScore: { type: Number, default: null },
  selfieImage:    { type: String, default: null },
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);