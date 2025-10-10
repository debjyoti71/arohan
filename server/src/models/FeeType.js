const mongoose = require('mongoose');

const feeTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  frequency: { type: String, enum: ['monthly', 'quarterly', 'biannual', 'yearly', 'one_time'], required: true },
  defaultAmount: { type: Number, required: true },
  description: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('FeeType', feeTypeSchema);