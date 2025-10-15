const mongoose = require('mongoose');

const studentFeeRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType', required: true },
  month: { type: String, required: true, maxlength: 20 },
  year: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  amountDue: { type: Number, required: true },
  frequency: { type: Number, default: 1 }, // How many times this fee should be paid (for frequency calculation)
  status: { type: String, enum: ['paid', 'unpaid', 'partial'], default: 'unpaid' }
}, {
  timestamps: true
});

// Virtual to calculate total paid amount from payments
studentFeeRecordSchema.virtual('totalPaid').get(function() {
  return this.payments ? this.payments.reduce((sum, payment) => sum + payment.amountPaid, 0) : 0;
});

// Virtual to calculate total discount from payments
studentFeeRecordSchema.virtual('totalDiscount').get(function() {
  return this.payments ? this.payments.reduce((sum, payment) => sum + payment.discount, 0) : 0;
});

// Virtual to calculate total yearly amount
studentFeeRecordSchema.virtual('yearlyAmount').get(function() {
  const feeType = this.feeTypeId || this.populated('feeTypeId');
  if (!feeType) return this.amountDue * 12; // Default to monthly
  
  switch (feeType.frequency) {
    case 'monthly': return this.amountDue * 12;
    case 'quarterly': return this.amountDue * 4;
    case 'biannual': return this.amountDue * 2;
    case 'yearly': return this.amountDue * 1;
    default: return this.amountDue * 12;
  }
});

// Virtual to calculate months paid
studentFeeRecordSchema.virtual('monthsPaid').get(function() {
  const totalPaidWithDiscount = this.totalPaid + this.totalDiscount;
  const monthsPaid = Math.floor(totalPaidWithDiscount / this.amountDue);
  const feeType = this.feeTypeId || this.populated('feeTypeId');
  
  if (!feeType) return { paid: monthsPaid, total: 12 };
  
  let totalMonths;
  switch (feeType.frequency) {
    case 'monthly': totalMonths = 12; break;
    case 'quarterly': totalMonths = 4; break;
    case 'biannual': totalMonths = 2; break;
    case 'yearly': totalMonths = 1; break;
    default: totalMonths = 12;
  }
  
  return { paid: Math.min(monthsPaid, totalMonths), total: totalMonths };
});

// Virtual to calculate remaining amount
studentFeeRecordSchema.virtual('remainingAmount').get(function() {
  const yearlyAmount = this.yearlyAmount;
  const totalPaid = this.totalPaid;
  const totalDiscount = this.totalDiscount;
  return Math.max(0, yearlyAmount - totalPaid - totalDiscount);
});

// Virtual to populate payments
studentFeeRecordSchema.virtual('payments', {
  ref: 'FeePayment',
  localField: '_id',
  foreignField: 'feeRecordId'
});

studentFeeRecordSchema.set('toJSON', { virtuals: true });
studentFeeRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StudentFeeRecord', studentFeeRecordSchema);