const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  role: { type: String, enum: ['principal', 'teacher', 'staff'], required: true },
  qualification: { type: String, maxlength: 100 },
  joinDate: { type: Date, required: true },
  salary: { type: Number, required: true },
  contact: { type: String, maxlength: 15 },
  status: { type: String, default: 'active', maxlength: 20 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Staff', staffSchema);