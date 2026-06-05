const Employee   = require('../models/employeeModel');
const Attendance = require('../models/attendanceModel');
const Location   = require('../models/locationModel');
const { getDistance }          = require('../utils/haversine');
const { getIO }                = require('../sockets/socketHandler');
const { todayString, currentTimeString, getAttendanceStatus } = require('../utils/helpers');
const path = require('path');

/* ── Euclidean distance for face matching ── */
const euclideanDistance = (d1, d2) => {
  if (!d1 || !d2 || d1.length !== d2.length) return Infinity;
  return Math.sqrt(d1.reduce((sum, v, i) => sum + Math.pow(v - d2[i], 2), 0));
};

const averageDescriptor = (descriptors) => {
  if (!descriptors || descriptors.length === 0) return null;
  const len = descriptors[0].length;
  const avg = new Array(len).fill(0);
  descriptors.forEach(d => d.forEach((v, i) => { avg[i] += v; }));
  return avg.map(v => v / descriptors.length);
};

/* ─────────────────────────────────────────────────
   STEP 1 — Validate GPS location only
   POST /api/gate/validate-location
   Body: { lat, lng }
───────────────────────────────────────────────── */
const validateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null)
      return res.status(400).json({ success: false, message: 'GPS coordinates required' });

    const locations = await Location.find({ isActive: true });
    if (locations.length === 0)
      return res.status(404).json({ success: false, message: 'No active locations configured' });

    let matchedLocation = null;
    let closestDistance = Infinity;
    let closestName     = '';

    for (const loc of locations) {
      const dist = getDistance(lat, lng, loc.latitude, loc.longitude);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestName     = loc.name;
      }
      if (dist <= loc.radius) {
        matchedLocation = loc;
        break;
      }
    }

    if (!matchedLocation) {
      return res.status(200).json({
        success: false,
        valid:   false,
        message: `Invalid Location — you are ${Math.round(closestDistance)}m away from ${closestName}`,
        closestDistance: Math.round(closestDistance),
        closestSite:     closestName,
      });
    }

    return res.status(200).json({
      success:  true,
      valid:    true,
      message:  `Location verified: ${matchedLocation.name}`,
      location: {
        _id:      matchedLocation._id,
        name:     matchedLocation.name,
        radius:   matchedLocation.radius,
        distance: Math.round(closestDistance),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────
   STEP 2 — Verify face (reuses same logic as faceController)
   POST /api/gate/verify-face
   Body: { descriptor }
───────────────────────────────────────────────── */
const verifyFace = async (req, res) => {
  try {
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor))
      return res.status(400).json({ success: false, message: 'Face descriptor required' });

    const employees = await Employee.find({ isActive: true });
    if (employees.length === 0)
      return res.status(404).json({ success: false, message: 'No registered employees found' });

    const THRESHOLD = 0.5;
    let bestMatch    = null;
    let bestDistance = Infinity;

    for (const emp of employees) {
      if (!emp.faceDescriptors || emp.faceDescriptors.length === 0) continue;
      const avgDesc = averageDescriptor(emp.faceDescriptors);
      const dist    = euclideanDistance(descriptor, avgDesc);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch    = emp;
      }
    }

    if (!bestMatch || bestDistance > THRESHOLD)
      return res.status(200).json({
        success: false,
        matched: false,
        message: 'Invalid Face Detected',
      });

    // Check duplicate punch today
    const today    = todayString();
    const existing = await Attendance.findOne({ employeeId: bestMatch.employeeId, date: today });
    if (existing)
      return res.status(200).json({
        success:       true,
        matched:       true,
        alreadyMarked: true,
        message:       'Attendance Already Marked Today',
        employee: {
          name:       bestMatch.name,
          employeeId: bestMatch.employeeId,
          department: bestMatch.department,
        },
      });

    return res.status(200).json({
      success:       true,
      matched:       true,
      alreadyMarked: false,
      message:       'Face Verified — Please take your selfie',
      employee: {
        _id:        bestMatch._id,
        name:       bestMatch.name,
        employeeId: bestMatch.employeeId,
        department: bestMatch.department,
      },
      faceMatchScore: parseFloat((1 - bestDistance).toFixed(3)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────
   STEP 3 — Save attendance with selfie
   POST /api/gate/punch          (multipart/form-data)
   Fields: employeeId, employeeName, department,
           locationId, locationName, lat, lng, faceMatchScore
   File:   selfie (image)
───────────────────────────────────────────────── */
const gatePunch = async (req, res) => {
  try {
    const {
      employeeId, employeeName, department,
      locationId, locationName,
      lat, lng,
      faceMatchScore,
    } = req.body;

    if (!employeeId || !locationId)
      return res.status(400).json({ success: false, message: 'employeeId and locationId are required' });

    const today    = todayString();
    const existing = await Attendance.findOne({ employeeId, date: today });
    if (existing)
      return res.status(409).json({ success: false, message: 'Attendance Already Marked Today' });

    const selfieImage = req.file
      ? `/uploads/selfies/${req.file.filename}`
      : null;

    const timeStr = currentTimeString();
    const status  = getAttendanceStatus();

    const attendance = await Attendance.create({
      employeeId,
      employeeName,
      department:     department || 'General',
      date:           today,
      time:           timeStr,
      status,
      punchType:      'gate',
      locationId,
      locationName,
      gps:            { lat: parseFloat(lat), lng: parseFloat(lng) },
      faceMatchScore: faceMatchScore ? parseFloat(faceMatchScore) : null,
      selfieImage,
    });

    // Emit real-time update
    try {
      getIO().emit('attendanceMarked', {
        employeeId,
        employeeName,
        department:   department || 'General',
        date:         today,
        time:         timeStr,
        status,
        punchType:    'gate',
        locationName,
      });
    } catch (_) { /* socket optional */ }

    return res.status(201).json({
      success:    true,
      message:    'Gate Punch Successful — Attendance Marked!',
      attendance,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────
   GET gate punch records only
   GET /api/gate/logs
───────────────────────────────────────────────── */
const getGatePunchLogs = async (req, res) => {
  try {
    const { date, page = 1, limit = 50 } = req.query;
    const filter = { punchType: 'gate' };
    if (date) filter.date = date;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Attendance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Attendance.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: parseInt(page), records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { validateLocation, verifyFace, gatePunch, getGatePunchLogs };