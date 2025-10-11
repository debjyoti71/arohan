const mongoose = require('mongoose');

const studentFeeRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType', required: true },
  month: { type: String, required: true, maxlength: 20 },
  dueDate: { type: Date, required: true },
  amountDue: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountRemarks: { type: String, default: '' },
  paymentDate: { type: Date },
  lastPaymentDate: { type: Date },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'cheque', 'bank_transfer'], default: 'cash' },
  paidBy: { type: String, enum: ['cash', 'online'] },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  status: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid' }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudentFeeRecord', studentFeeRecordSchema);