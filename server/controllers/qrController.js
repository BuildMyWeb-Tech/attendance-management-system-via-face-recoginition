const Employee    = require('../models/employeeModel');
const Attendance  = require('../models/attendanceModel');
const QRScanLog   = require('../models/qrScanLogModel');
const { getIO }   = require('../sockets/socketHandler');
const { todayString, currentTimeString, getAttendanceStatus } = require('../utils/helpers');
const { Parser }  = require('json2csv');

/* ─────────────────────────────────────────────
   GET /api/qr/verify/:employeeId
   Public — verifies employee exists by employeeId
───────────────────────────────────────────── */
const verifyEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId)
      return res.status(400).json({ success: false, message: 'employeeId is required' });

    const employee = await Employee.findOne({ employeeId: employeeId.trim(), isActive: true })
      .select('-faceDescriptors -faceImages');

    if (!employee)
      return res.status(404).json({ success: false, message: 'Employee not found or inactive' });

    // Check if already marked today
    const today    = todayString();
    const existing = await Attendance.findOne({ employeeId: employee.employeeId, date: today });

    return res.status(200).json({
      success:       true,
      employee:      employee,
      alreadyMarked: !!existing,
      markedTime:    existing?.time || null,
      markedType:    existing?.attendanceType || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/qr/mark-attendance
   Body: { employeeId, qrPayload, scannedBy }
   Marks attendance as QR type + saves scan log
───────────────────────────────────────────── */
const markQRAttendance = async (req, res) => {
  try {
    const { employeeId, qrPayload, scannedBy } = req.body;

    if (!employeeId || !qrPayload)
      return res.status(400).json({ success: false, message: 'employeeId and qrPayload are required' });

    const employee = await Employee.findOne({ employeeId: employeeId.trim(), isActive: true })
      .select('-faceDescriptors -faceImages');

    if (!employee) {
      // Save failed log
      await QRScanLog.create({
        employeeId:   employeeId,
        employeeCode: employeeId,
        employeeName: 'Unknown',
        qrPayload,
        status:     'FAILED',
        failReason: 'Employee not found',
        scannedBy:  scannedBy || 'admin',
      }).catch(() => {});

      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const today    = todayString();
    const existing = await Attendance.findOne({ employeeId: employee.employeeId, date: today });

    if (existing) {
      // Save scan log as duplicate
      await QRScanLog.create({
        employeeId:   employee.employeeId,
        employeeCode: employee.employeeId,
        employeeName: employee.name,
        department:   employee.department,
        qrPayload,
        status:     'FAILED',
        failReason: 'Attendance already marked today',
        scannedBy:  scannedBy || 'admin',
      }).catch(() => {});

      return res.status(409).json({
        success:       false,
        alreadyMarked: true,
        message:       'Attendance Already Marked Today',
        markedTime:    existing.time,
        markedType:    existing.attendanceType,
      });
    }

    const timeStr = currentTimeString();
    const status  = getAttendanceStatus();

    // Create attendance record
    const attendance = await Attendance.create({
      employeeId:     employee.employeeId,
      employeeName:   employee.name,
      department:     employee.department,
      date:           today,
      time:           timeStr,
      status,
      attendanceType: 'QR',
    });

    // Save scan log as success
    const scanLog = await QRScanLog.create({
      employeeId:   employee.employeeId,
      employeeCode: employee.employeeId,
      employeeName: employee.name,
      department:   employee.department,
      qrPayload,
      status:    'SUCCESS',
      scannedBy: scannedBy || 'admin',
    });

    // Socket.io real-time event
    try {
      getIO().emit('attendanceMarked', {
        employeeId:     employee.employeeId,
        employeeName:   employee.name,
        department:     employee.department,
        date:           today,
        time:           timeStr,
        status,
        attendanceType: 'QR',
      });
    } catch (_) { /* socket optional */ }

    return res.status(201).json({
      success:    true,
      message:    'QR Attendance Marked Successfully',
      attendance,
      scanLog,
      employee: {
        name:       employee.name,
        employeeId: employee.employeeId,
        department: employee.department,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   POST /api/qr/log
   Save a scan log entry (for failed scans from frontend)
───────────────────────────────────────────── */
const saveScanLog = async (req, res) => {
  try {
    const { employeeId, employeeCode, employeeName, qrPayload, status, failReason, scannedBy } = req.body;
    const log = await QRScanLog.create({
      employeeId:   employeeId   || 'unknown',
      employeeCode: employeeCode || 'unknown',
      employeeName: employeeName || 'Unknown',
      qrPayload:    qrPayload    || '',
      status:       status       || 'FAILED',
      failReason:   failReason   || null,
      scannedBy:    scannedBy    || 'admin',
    });
    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   GET /api/qr/logs
   Query params: page, limit, search, dateFrom, dateTo
───────────────────────────────────────────── */
const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.scannedAt = {};
      if (dateFrom) filter.scannedAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
      if (dateTo)   filter.scannedAt.$lte = new Date(dateTo   + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      QRScanLog.find(filter).sort({ scannedAt: -1 }).skip(skip).limit(parseInt(limit)),
      QRScanLog.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: parseInt(page), logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────
   GET /api/qr/logs/export?format=csv
   Exports all filtered logs as CSV
───────────────────────────────────────────── */
const exportLogs = async (req, res) => {
  try {
    const { search, dateFrom, dateTo } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ];
    }
    if (dateFrom || dateTo) {
      filter.scannedAt = {};
      if (dateFrom) filter.scannedAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
      if (dateTo)   filter.scannedAt.$lte = new Date(dateTo   + 'T23:59:59.999Z');
    }

    const logs = await QRScanLog.find(filter).sort({ scannedAt: -1 });

    const fields = [
      { label: 'Date',          value: (row) => new Date(row.scannedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) },
      { label: 'Time',          value: (row) => new Date(row.scannedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) },
      { label: 'Employee Code', value: 'employeeCode' },
      { label: 'Employee Name', value: 'employeeName' },
      { label: 'Department',    value: 'department'   },
      { label: 'Status',        value: 'status'       },
      { label: 'Fail Reason',   value: (row) => row.failReason || '' },
      { label: 'Scanned By',    value: 'scannedBy'    },
    ];

    const parser = new Parser({ fields });
    const csv    = parser.parse(logs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="qr_scan_logs.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { verifyEmployee, markQRAttendance, saveScanLog, getLogs, exportLogs };