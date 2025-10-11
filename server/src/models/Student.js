const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNo: { type: String, required: true, unique: true, maxlength: 50 },
  name: { type: String, required: true, maxlength: 100 },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''] },
  dateOfAdmission: { type: Date },
  email: { type: String, maxlength: 100, default: '' },
  aadhar: { type: String, maxlength: 12, default: '' },
  reAdmissionOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  guardianName: { type: String, maxlength: 100 },
  guardianContact: { type: String, maxlength: 15 },
  guardianOccupation: { type: String, maxlength: 100, default: '' },
  address: { type: String },
  profileImage: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive', 'passed', 'left'], default: 'active' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Student', studentSchema);