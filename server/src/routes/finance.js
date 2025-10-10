const express = require('express');
const Joi = require('joi');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const accountSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('bank', 'cash').required(),
  balance: Joi.number().min(0).default(0),
  bankDetails: Joi.object({
    accountNumber: Joi.string().allow('').optional(),
    bankName: Joi.string().allow('').optional(),
    ifscCode: Joi.string().allow('').optional()
  }).optional()
});

const transactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense', 'transfer').required(),
  category: Joi.string().valid('fees', 'donation', 'investment', 'salary', 'maintenance', 'supplies', 'utilities', 'transport', 'transfer', 'other').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().required(),
  fromAccount: Joi.string().allow('').optional(),
  toAccount: Joi.string().allow('').optional(),
  transactionDate: Joi.date().required(),
  referenceNumber: Joi.string().allow('').optional()
});

// Account routes
router.get('/accounts', authenticateToken, authorize(['finance:read']), async (req, res) => {
  try {
    const accounts = await Account.find({ isActive: true }).sort({ name: 1 });
    res.json(accounts.map(acc => ({
      ...acc.toObject(),
      accountId: acc._id
    })));
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/accounts', authenticateToken, authorize(['finance:create']), async (req, res) => {
  try {
    const { error } = accountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const account = await Account.create(req.body);
    res.status(201).json({
      ...account.toObject(),
      accountId: account._id
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/accounts/:id', authenticateToken, authorize(['finance:delete']), async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await Account.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transaction routes
router.get('/transactions', authenticateToken, authorize(['finance:read']), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, accountId } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (accountId) {
      filter.$or = [
        { fromAccount: accountId },
        { toAccount: accountId }
      ];
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('fromAccount')
        .populate('toAccount')
        .populate('createdBy')
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ transactionDate: -1 }),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      transactions: transactions.map(t => ({
        ...t.toObject(),
        transactionId: t._id
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/transactions', authenticateToken, authorize(['finance:create']), async (req, res) => {
  try {
    const { error } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const transactionData = {
      ...req.body,
      createdBy: req.user.userId
    };
    
    // Remove empty account fields to avoid ObjectId casting errors
    if (!transactionData.fromAccount) {
      delete transactionData.fromAccount;
    }
    if (!transactionData.toAccount) {
      delete transactionData.toAccount;
    }

    const transaction = await Transaction.create(transactionData);

    // Update account balances
    if (transaction.type === 'income' && transaction.toAccount) {
      await Account.findByIdAndUpdate(transaction.toAccount, {
        $inc: { balance: transaction.amount }
      });
    } else if (transaction.type === 'expense' && transaction.fromAccount) {
      await Account.findByIdAndUpdate(transaction.fromAccount, {
        $inc: { balance: -transaction.amount }
      });
    } else if (transaction.type === 'transfer') {
      await Account.findByIdAndUpdate(transaction.fromAccount, {
        $inc: { balance: -transaction.amount }
      });
      await Account.findByIdAndUpdate(transaction.toAccount, {
        $inc: { balance: transaction.amount }
      });
    }

    await transaction.populate(['fromAccount', 'toAccount', 'createdBy']);

    res.status(201).json({
      ...transaction.toObject(),
      transactionId: transaction._id
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard summary
router.get('/summary', authenticateToken, authorize(['finance:read']), async (req, res) => {
  try {
    const accounts = await Account.find({ isActive: true });
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const bankBalance = accounts.filter(acc => acc.type === 'bank').reduce((sum, acc) => sum + acc.balance, 0);
    const cashBalance = accounts.filter(acc => acc.type === 'cash').reduce((sum, acc) => sum + acc.balance, 0);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyIncome = await Transaction.aggregate([
      {
        $match: {
          type: 'income',
          transactionDate: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyExpense = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          transactionDate: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      totalBalance,
      bankBalance,
      cashBalance,
      monthlyIncome: monthlyIncome[0]?.total || 0,
      monthlyExpense: monthlyExpense[0]?.total || 0,
      accounts: accounts.length
    });
  } catch (error) {
    console.error('Get finance summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;