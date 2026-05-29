const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password required' });

    const admin = await Admin.findOne({ username });
    if (!admin)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, username: admin.username, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ success: true, token, admin: { id: admin._id, username: admin.username, name: admin.name } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, admin: req.admin });
};

module.exports = { login, getMe };
