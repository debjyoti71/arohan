const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentFeeRecord', required: true },
  amountPaid: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  discountRemarks: { type: String, default: '' },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'upi', 'cheque', 'bank_transfer'], 
    default: 'cash' 
  },
  paymentDate: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  receiptNumber: { type: String },
  remarks: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('FeePayment', feePaymentSchema);