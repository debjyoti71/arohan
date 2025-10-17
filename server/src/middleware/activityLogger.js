const ActivityLog = require('../models/ActivityLog');
const googleSheetsLogger = require('../utils/googleSheets');

const logActivity = async (req, action, resource, details = {}) => {
  try {
    const logData = {
      userId: req.user?.userId,
      username: req.user?.username,
      alias: req.user?.alias,
      action,
      resource,
      resourceId: details.resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    // Save to MongoDB
    await ActivityLog.create(logData);

    // Log to Google Sheets
    await googleSheetsLogger.logActivity(logData);
  } catch (error) {
    console.error('Activity logging error:', error);
  }
};

const activityLogger = (action, resource) => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logActivity(req, action, resource, { 
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          resourceId: req.params.id
        });
      }
      originalSend.call(this, data);
    };
    next();
  };
};

module.exports = { logActivity, activityLogger };