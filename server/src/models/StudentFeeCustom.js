const mongoose = require('mongoose');

const studentFeeCustomSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType', required: true },
  customAmount: { type: Number },
  isApplicable: { type: Boolean, default: true },
  remarks: { type: String, maxlength: 255 }
}, {
  timestamps: true
});

studentFeeCustomSchema.index({ studentId: 1, feeTypeId: 1 }, { unique: true });

module.exports = mongoose.model('StudentFeeCustom', studentFeeCustomSchema);