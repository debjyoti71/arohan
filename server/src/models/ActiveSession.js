const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  alias: { type: String },
  loginTime: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Auto-expire sessions after 24 hours of inactivity
activeSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('ActiveSession', activeSessionSchema);