const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const Staff = require('../models/Staff');
const ActiveSession = require('../models/ActiveSession');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');
const { PREDEFINED_ROLES } = require('../utils/permissions');

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password } = req.body;

    const user = await User.findOne({ username, isActive: true });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login and create active session
    await Promise.all([
      User.findByIdAndUpdate(user._id, { lastLogin: new Date(), isOnline: true }),
      ActiveSession.findOneAndUpdate(
        { userId: user._id },
        {
          username: user.username,
          alias: user.alias,
          loginTime: new Date(),
          lastActivity: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          isActive: true
        },
        { upsert: true }
      )
    ]);

    // Get user permissions
    let userPermissions = user.permissions;
    if (user.role !== 'custom' && PREDEFINED_ROLES[user.role]) {
      userPermissions = PREDEFINED_ROLES[user.role].permissions;
    }

    // Log login activity
    await logActivity({
      user: { userId: user._id, username: user.username, alias: user.alias },
      ip: req.ip || req.connection.remoteAddress
    }, 'login', 'auth', { loginTime: new Date() });

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        userId: user._id,
        username: user.username,
        role: user.role,
        alias: user.alias,
        permissions: userPermissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    // Get user permissions
    let userPermissions = user.permissions;
    if (user.role !== 'custom' && PREDEFINED_ROLES[user.role]) {
      userPermissions = PREDEFINED_ROLES[user.role].permissions;
    }

    res.json({
      userId: user._id,
      username: user.username,
      role: user.role,
      alias: user.alias,
      permissions: userPermissions
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Update user online status and remove active session
    await Promise.all([
      User.findByIdAndUpdate(req.user.userId, { isOnline: false }),
      ActiveSession.findOneAndUpdate(
        { userId: req.user.userId },
        { isActive: false }
      )
    ]);

    // Log logout activity
    await logActivity(req, 'logout', 'auth', { logoutTime: new Date() });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;