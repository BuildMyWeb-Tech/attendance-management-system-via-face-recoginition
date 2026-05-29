const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  department: { type: String, default: 'General' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
