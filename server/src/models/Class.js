const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  className: { type: String, required: true, unique: true, maxlength: 50 },
  classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Class', classSchema);