const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  category: { type: String, enum: ['fees', 'donation', 'investment', 'salary', 'maintenance', 'supplies', 'utilities', 'transfer', 'other'], required: true },
  amount: { type: Number, required: true },
  description: { 
    type: String, 
    required: function() { return this.category === 'other'; }
  },
  fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  transactionDate: { type: Date, required: true },
  referenceNumber: { type: String },
  attachments: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);