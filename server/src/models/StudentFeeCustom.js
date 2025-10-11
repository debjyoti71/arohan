const mongoose = require('mongoose');

const studentFeeCustomSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType', required: true },
  customAmount: { type: Number },
  isApplicable: { type: Boolean, default: true },
  remarks: { type: String, maxlength: 255 },
  // Payment frequency
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'biannual', 'yearly'],
    default: 'monthly'
  },
  // Discount fields (fixed amount only)
  discountAmount: { type: Number, default: 0 },
  discountReason: { 
    type: String, 
    enum: ['scholarship', 'sibling_discount', 'staff_child', 'merit', 'financial_aid', 'other'],
    default: 'other'
  },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date }
}, {
  timestamps: true
});

studentFeeCustomSchema.index({ studentId: 1, feeTypeId: 1 }, { unique: true });

module.exports = mongoose.model('StudentFeeCustom', studentFeeCustomSchema);