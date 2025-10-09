const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const User = require('../models/User');
const Staff = require('../models/Staff');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const userSchema = Joi.object({
  staffId: Joi.string().required(),
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'principal', 'staff').required(),
  alias: Joi.string().optional(),
  permissions: Joi.object().optional()
});

// Get all users (Admin only)
router.get('/', authenticateToken, authorize(['users:read']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { alias: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('staffId')
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);

    // Remove password hash from response
    const sanitizedUsers = users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user.toObject();
      return {
        ...userWithoutPassword,
        userId: user._id,
        staff: user.staffId ? { ...user.staffId.toObject(), staffId: user.staffId._id } : null
      };
    });

    res.json({
      users: sanitizedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (Admin only)
router.post('/', authenticateToken, authorize(['users:create']), async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { password, ...userData } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      ...userData,
      passwordHash
    });
    
    await user.populate('staffId');

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user.toObject();
    res.status(201).json({
      ...userWithoutPassword,
      userId: user._id,
      staff: user.staffId ? { ...user.staffId.toObject(), staffId: user.staffId._id } : null
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available staff for user creation
router.get('/available/staff', authenticateToken, authorize(['users:read']), async (req, res) => {
  try {
    const usedStaffIds = await User.distinct('staffId');
    const availableStaff = await Staff.find({
      status: 'active',
      _id: { $nin: usedStaffIds }
    }).select('name role');

    res.json(availableStaff.map(staff => ({
      staffId: staff._id,
      name: staff.name,
      role: staff.role
    })));
  } catch (error) {
    console.error('Get available staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;