const mongoose = require('mongoose');

const staffTransactionSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  amount: { type: Number, required: true },
  transactionType: { type: String, enum: ['salary', 'bonus', 'deduction'], default: 'salary' },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  remarks: { type: String },
  status: { type: String, enum: ['paid', 'pending'], default: 'paid' }
}, {
  timestamps: true
});

// Compound index to prevent duplicate salary entries for same staff/month/year
staffTransactionSchema.index({ staffId: 1, month: 1, year: 1, transactionType: 1 }, { unique: true });

module.exports = mongoose.model('StaffTransaction', staffTransactionSchema);