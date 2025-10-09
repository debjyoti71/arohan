const mongoose = require('mongoose');

const classFeeStructureSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  feeTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType', required: true },
  amount: { type: Number, required: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: true
});

classFeeStructureSchema.index({ classId: 1, feeTypeId: 1 }, { unique: true });

module.exports = mongoose.model('ClassFeeStructure', classFeeStructureSchema);