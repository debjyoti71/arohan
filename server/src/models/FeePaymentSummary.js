const mongoose = require('mongoose');

const feePaymentSummarySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  feeTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeType',
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
  },
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'biannual', 'yearly'],
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  periodsPaid: {
    type: Number,
    default: 0,
  },
  totalPeriods: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending',
  },
  nextDueDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

feePaymentSummarySchema.index({ studentId: 1, feeTypeId: 1, academicYear: 1 }, { unique: true });

const FeePaymentSummary = mongoose.model('FeePaymentSummary', feePaymentSummarySchema);

module.exports = FeePaymentSummary;