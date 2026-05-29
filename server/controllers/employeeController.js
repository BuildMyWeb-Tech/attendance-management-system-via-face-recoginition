const Employee = require('../models/employeeModel');
const fs = require('fs');
const path = require('path');

const registerEmployee = async (req, res) => {
  try {
    const { name, employeeId, department, faceDescriptors } = req.body;
    if (!name || !employeeId || !faceDescriptors)
      return res.status(400).json({ success: false, message: 'Name, employeeId, and faceDescriptors required' });

    const existing = await Employee.findOne({ employeeId });
    if (existing)
      return res.status(409).json({ success: false, message: 'Employee ID already registered' });

    let descriptors;
    try {
      descriptors = typeof faceDescriptors === 'string' ? JSON.parse(faceDescriptors) : faceDescriptors;
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid faceDescriptors format' });
    }

    const faceImages = req.files ? req.files.map(f => `/uploads/faces/${f.filename}`) : [];

    const employee = await Employee.create({ name, employeeId, department: department || 'General', faceDescriptors: descriptors, faceImages });

    res.status(201).json({ success: true, message: 'Employee registered successfully', employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).select('-faceDescriptors').sort({ createdAt: -1 });
    res.json({ success: true, count: employees.length, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-faceDescriptors');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    employee.faceImages.forEach(imgPath => {
      const full = path.join(__dirname, '..', imgPath);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    });
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { registerEmployee, getAllEmployees, getEmployee, deleteEmployee };
