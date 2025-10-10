const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  type: { type: String, enum: ['bank', 'cash'], required: true },
  balance: { type: Number, default: 0 },
  bankDetails: {
    accountNumber: { type: String },
    bankName: { type: String },
    ifscCode: { type: String }
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Account', accountSchema);