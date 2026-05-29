const Employee = require('../models/employeeModel');
const Attendance = require('../models/attendanceModel');
const { getIO } = require('../sockets/socketHandler');
const { todayString, currentTimeString, getAttendanceStatus } = require('../utils/helpers');

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

const verifyFace = async (req, res) => {
  try {
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor))
      return res.status(400).json({ success: false, message: 'Face descriptor required' });

    const employees = await Employee.find({ isActive: true });
    if (employees.length === 0)
      return res.status(404).json({ success: false, message: 'No registered employees found' });

    const THRESHOLD = 0.5;
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const emp of employees) {
      if (!emp.faceDescriptors || emp.faceDescriptors.length === 0) continue;
      const avgDesc = averageDescriptor(emp.faceDescriptors);
      const dist = euclideanDistance(descriptor, avgDesc);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = emp;
      }
    }

    if (!bestMatch || bestDistance > THRESHOLD) {
      return res.status(200).json({
        success: false,
        matched: false,
        message: 'Invalid Face Detected',
        distance: bestDistance
      });
    }

    const today = todayString();
    const existing = await Attendance.findOne({ employeeId: bestMatch.employeeId, date: today });
    if (existing) {
      return res.status(200).json({
        success: true,
        matched: true,
        alreadyMarked: true,
        message: 'Attendance Already Marked Today',
        employee: { name: bestMatch.name, employeeId: bestMatch.employeeId, department: bestMatch.department },
        distance: bestDistance
      });
    }

    const timeStr = currentTimeString();
    const status = getAttendanceStatus();

    const attendance = await Attendance.create({
      employeeId: bestMatch.employeeId,
      employeeName: bestMatch.name,
      department: bestMatch.department,
      date: today,
      time: timeStr,
      status
    });

    try {
      getIO().emit('attendanceMarked', {
        employeeId: bestMatch.employeeId,
        employeeName: bestMatch.name,
        department: bestMatch.department,
        date: today,
        time: timeStr,
        status
      });
    } catch (e) { /* socket optional */ }

    return res.status(200).json({
      success: true,
      matched: true,
      alreadyMarked: false,
      message: 'Attendance Marked Successfully',
      employee: { name: bestMatch.name, employeeId: bestMatch.employeeId, department: bestMatch.department },
      attendance,
      distance: bestDistance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { verifyFace };
