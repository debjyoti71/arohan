const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNo: { type: String, required: true, unique: true, maxlength: 50 },
  name: { type: String, required: true, maxlength: 100 },
  dob: { type: Date },
  gender: { type: String, maxlength: 1 },
  admissionDate: { type: Date },
  reAdmissionOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  guardianName: { type: String, maxlength: 100 },
  guardianContact: { type: String, maxlength: 15 },
  address: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'passed', 'left'], default: 'active' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);