const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const User = require('../models/User');
const Staff = require('../models/Staff');
const ActiveSession = require('../models/ActiveSession');
const { authenticateToken, authorize } = require('../middleware/auth');
const { activityLogger } = require('../middleware/activityLogger');
const { PREDEFINED_ROLES, ALL_PERMISSIONS, formatPermissionsForUser } = require('../utils/permissions');

const router = express.Router();

// Validation schemas
const userSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().optional(),
  role: Joi.string().valid('admin', 'principal', 'staff', 'custom').required(),
  alias: Joi.string().optional(),
  permissions: Joi.object().optional(),
  customPermissions: Joi.array().items(Joi.object({
    resource: Joi.string().required(),
    action: Joi.string().required()
  })).optional()
});

// Get all users
router.get('/', authenticateToken, async (req, res) => {
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

    const [users, total, activeSessions] = await Promise.all([
      User.find(filter)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
      ActiveSession.find({ isActive: true })
    ]);

    const activeUserIds = new Set(activeSessions.map(s => s.userId.toString()));

    // Remove password hash from response
    const sanitizedUsers = users.map(user => {
      const { passwordHash, ...userWithoutPassword } = user.toObject();
      return {
        ...userWithoutPassword,
        userId: user._id,
        isOnline: activeUserIds.has(user._id.toString())
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

// Create new user
router.post('/', authenticateToken, activityLogger('create', 'user'), async (req, res) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { password, customPermissions, ...userData } = req.body;
    const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('default123', 10);

    // Handle permissions
    let permissions = {};
    if (userData.role === 'custom' && customPermissions) {
      permissions = formatPermissionsForUser(customPermissions);
    } else if (PREDEFINED_ROLES[userData.role]) {
      permissions = PREDEFINED_ROLES[userData.role].permissions;
    }

    const user = await User.create({
      ...userData,
      passwordHash,
      permissions
    });

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user.toObject();
    res.status(201).json({
      ...userWithoutPassword,
      userId: user._id
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get predefined roles
router.get('/roles/predefined', authenticateToken, (req, res) => {
  res.json(PREDEFINED_ROLES);
});

// Get all available permissions
router.get('/permissions/all', authenticateToken, (req, res) => {
  res.json(ALL_PERMISSIONS);
});

// Get active users
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeSessions = await ActiveSession.find({ isActive: true })
      .populate('userId', 'username alias role')
      .sort({ lastActivity: -1 });

    const activeUsers = activeSessions.map(session => ({
      userId: session.userId._id,
      username: session.userId.username,
      alias: session.userId.alias,
      role: session.userId.role,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity
    }));

    res.json(activeUsers);
  } catch (error) {
    console.error('Get active users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, activityLogger('update', 'user'), async (req, res) => {
  try {
    const { password, customPermissions, ...updateData } = req.body;
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Handle permissions
    if (updateData.role === 'custom' && customPermissions) {
      updateData.permissions = formatPermissionsForUser(customPermissions);
    } else if (PREDEFINED_ROLES[updateData.role]) {
      updateData.permissions = PREDEFINED_ROLES[updateData.role].permissions;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user.toObject();
    res.json({
      ...userWithoutPassword,
      userId: user._id
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/:id', authenticateToken, activityLogger('delete', 'user'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove active session
    await ActiveSession.deleteOne({ userId: req.params.id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;