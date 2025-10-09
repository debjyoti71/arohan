const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  username: { type: String, required: true, unique: true, maxlength: 50 },
  passwordHash: { type: String, required: true, maxlength: 255 },
  role: { type: String, enum: ['admin', 'principal', 'staff'], required: true },
  alias: { type: String, maxlength: 100 },
  permissions: { type: mongoose.Schema.Types.Mixed },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);