const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActiveSession = require('../models/ActiveSession');
const { PREDEFINED_ROLES, hasPermission } = require('../utils/permissions');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Update last activity
    await ActiveSession.findOneAndUpdate(
      { userId: user._id },
      { 
        lastActivity: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      },
      { upsert: true }
    );

    // Get user permissions (predefined or custom)
    let userPermissions = user.permissions;
    if (user.role !== 'custom' && PREDEFINED_ROLES[user.role]) {
      userPermissions = PREDEFINED_ROLES[user.role].permissions;
    }

    req.user = {
      ...user.toObject(),
      userId: user._id,
      permissions: userPermissions
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check specific permissions
    if (requiredPermissions.length > 0) {
      const userPermissions = req.user.permissions || {};
      const hasRequiredPermission = requiredPermissions.some(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(userPermissions, resource, action);
      });

      if (!hasRequiredPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    next();
  };
};

module.exports = { authenticateToken, authorize };