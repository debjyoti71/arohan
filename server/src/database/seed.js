const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const connectDB = require('../utils/database');
const Staff = require('../models/Staff');
const User = require('../models/User');
const Class = require('../models/Class');
const FeeType = require('../models/FeeType');

async function seed() {
  try {
    await connectDB();
    
    // Clear existing data
    await Promise.all([
      Staff.deleteMany({}),
      User.deleteMany({}),
      Class.deleteMany({}),
      FeeType.deleteMany({})
    ]);

    // Create admin staff
    const adminStaff = await Staff.create({
      name: 'Administrator',
      role: 'principal',
      qualification: 'Masters in Education',
      joinDate: new Date(),
      salary: 50000,
      contact: '9999999999',
      status: 'active'
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      staffId: adminStaff._id,
      username: 'admin',
      passwordHash: hashedPassword,
      role: 'admin',
      alias: 'System Administrator',
      permissions: {
        users: ['create', 'read', 'update', 'delete'],
        students: ['create', 'read', 'update', 'delete'],
        staff: ['create', 'read', 'update', 'delete'],
        classes: ['create', 'read', 'update', 'delete'],
        fees: ['create', 'read', 'update', 'delete']
      }
    });

    // Create sample classes
    await Class.insertMany([
      { className: 'Class 1' },
      { className: 'Class 2' },
      { className: 'Class 3' },
      { className: 'Class 4' },
      { className: 'Class 5' }
    ]);

    // Create sample fee types
    await FeeType.insertMany([
      { name: 'Tuition Fee', frequency: 'monthly', defaultAmount: 5000, description: 'Monthly tuition fee' },
      { name: 'Transport Fee', frequency: 'monthly', defaultAmount: 2000, description: 'Monthly transport fee' },
      { name: 'Annual Fee', frequency: 'yearly', defaultAmount: 10000, description: 'Annual school fee' },
      { name: 'Admission Fee', frequency: 'one_time', defaultAmount: 15000, description: 'One-time admission fee' }
    ]);

    console.log('✅ Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();