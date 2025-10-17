const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, maxlength: 50 },
  passwordHash: { type: String, required: true, maxlength: 255 },
  role: { type: String, enum: ['admin', 'principal', 'staff', 'custom'], required: true },
  alias: { type: String, maxlength: 100 },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  customRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);