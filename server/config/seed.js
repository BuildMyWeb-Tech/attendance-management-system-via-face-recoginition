const bcrypt = require('bcryptjs');
const Admin = require('../models/adminModel');

const seedAdmin = async () => {
  try {
    const existing = await Admin.findOne({ username: 'admin' });
    if (!existing) {
      const hashed = await bcrypt.hash('admin123', 10);
      await Admin.create({ username: 'admin', password: hashed, name: 'Super Admin' });
      console.log('Default admin created: admin / admin123');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

module.exports = seedAdmin;
