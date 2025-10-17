const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [{
    resource: { type: String, required: true },
    actions: [{ type: String, required: true }]
  }],
  isSystem: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);