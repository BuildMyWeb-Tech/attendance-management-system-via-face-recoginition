const Attendance = require('../models/attendanceModel');
const Employee = require('../models/employeeModel');
const { todayString, currentTimeString, getAttendanceStatus } = require('../utils/helpers');

const markAttendance = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = todayString();
    const existing = await Attendance.findOne({ employeeId, date: today });
    if (existing)
      return res.status(409).json({ success: false, message: 'Attendance Already Marked Today' });
    const emp = await Employee.findOne({ employeeId });
    if (!emp)
      return res.status(404).json({ success: false, message: 'Employee not found' });
    const attendance = await Attendance.create({
      employeeId,
      employeeName: emp.name,
      department: emp.department,
      date: today,
      time: currentTimeString(),
      status: getAttendanceStatus()
    });
    res.status(201).json({ success: true, attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ date: todayString() }).sort({ createdAt: -1 });
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const { date, employeeId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (employeeId) filter.employeeId = employeeId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Attendance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Attendance.countDocuments(filter)
    ]);
    res.json({ success: true, total, page: parseInt(page), records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const today = todayString();
    const [totalEmployees, todayCount, recentLogs] = await Promise.all([
      Employee.countDocuments({ isActive: true }),
      Attendance.countDocuments({ date: today }),
      Attendance.find().sort({ createdAt: -1 }).limit(10)
    ]);
    res.json({ success: true, stats: { totalEmployees, todayCount }, recentLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { markAttendance, getTodayAttendance, getAllAttendance, getDashboardStats };
