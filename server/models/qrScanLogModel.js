const mongoose = require('mongoose');

const qrScanLogSchema = new mongoose.Schema({
  employeeId:   { type: String, required: true },
  employeeCode: { type: String, required: true },
  employeeName: { type: String, required: true },
  department:   { type: String, default: 'General' },
  qrPayload:    { type: String, required: true },
  status:       { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
  failReason:   { type: String, default: null },
  scannedBy:    { type: String, required: true },
  scannedAt:    { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('QRScanLog', qrScanLogSchema);