const express = require('express');
const Joi = require('joi');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const FeeCalculator = require('../utils/feeCalculator');
const FeePaymentSummary = require('../models/FeePaymentSummary');
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
  description: Joi.when('category', {
    is: 'other',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  fromAccount: Joi.string().allow('').optional(),
  toAccount: Joi.string().allow('').optional(),
  staffId: Joi.when('category', {
    is: 'salary',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional()
  }),
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
    if (!transactionData.staffId) {
      delete transactionData.staffId;
    }

    const transaction = await Transaction.create(transactionData);

    // Create staff transaction for salary payments
    if (transaction.category === 'salary' && transaction.staffId) {
      const StaffTransaction = require('../models/StaffTransaction');
      const transactionDate = new Date(transaction.transactionDate);
      
      await StaffTransaction.create({
        staffId: transaction.staffId,
        amount: transaction.amount,
        transactionType: 'salary',
        month: transactionDate.getMonth() + 1,
        year: transactionDate.getFullYear(),
        paymentDate: transaction.transactionDate,
        remarks: transaction.description || 'Salary payment'
      });
    }

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

// Get student fee summary with payment ratios
router.get('/students/:id/fee-summary', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const StudentFeeCustom = require('../models/StudentFeeCustom');
    const FeeType = require('../models/FeeType');
    
    const customFees = await StudentFeeCustom.find({ studentId: req.params.id })
      .populate('feeTypeId');
    
    const summaries = [];
    for (const customFee of customFees) {
      const status = await FeeCalculator.calculateFeeStatus(req.params.id, customFee.feeTypeId._id);
      if (status) {
        summaries.push({
          feeType: customFee.feeTypeId.name,
          ...status
        });
      }
    }
    
    res.json(summaries);
  } catch (error) {
    console.error('Get student fee summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process fee payment with ratio calculation
router.post('/payment-with-ratio', authenticateToken, authorize(['fees:create']), async (req, res) => {
  try {
    const { studentId, feeTypeId, amount, paymentMethod, paymentDate } = req.body;
    
    // Validate input
    if (!studentId || !feeTypeId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update payment status
    const summary = await FeeCalculator.updatePaymentStatus(
      studentId, 
      feeTypeId, 
      parseFloat(amount)
    );

    if (!summary) {
      return res.status(400).json({ error: 'Invalid fee structure or student not found' });
    }

    res.json({
      success: true,
      updatedRatio: {
        feeTypeId,
        paymentRatio: FeeCalculator.calculatePaymentRatio(summary.periodsPaid, summary.totalPeriods),
        status: summary.status
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply discount to student fee
router.post('/apply-discount', authenticateToken, authorize(['fees:update']), async (req, res) => {
  try {
    const { studentId, feeTypeId, discountAmount, discountReason, effectiveFrom, effectiveTo } = req.body;
    
    const StudentFeeCustom = require('../models/StudentFeeCustom');
    
    await StudentFeeCustom.findOneAndUpdate(
      { studentId, feeTypeId },
      {
        discountAmount: parseFloat(discountAmount) || 0,
        discountReason: discountReason || 'other',
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Discount applied successfully' });
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger for fee recalculation (for testing)
router.post('/trigger-fee-recalculation', authenticateToken, authorize(['finance:create']), async (req, res) => {
  try {
    const FeeScheduler = require('../utils/feeScheduler');
    await FeeScheduler.triggerRecalculation();
    res.json({ success: true, message: 'Fee recalculation triggered successfully' });
  } catch (error) {
    console.error('Trigger recalculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger for auto fee generation (for testing)
router.post('/trigger-auto-generation', authenticateToken, authorize(['finance:create']), async (req, res) => {
  try {
    const AutoFeeGenerator = require('../utils/autoFeeGenerator');
    await AutoFeeGenerator.triggerGeneration();
    res.json({ success: true, message: 'Auto fee generation triggered successfully' });
  } catch (error) {
    console.error('Trigger auto generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee configuration
router.get('/fee-config', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const feeConfig = require('../../config/fees');
    res.json(feeConfig);
  } catch (error) {
    console.error('Get fee config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update fee configuration
router.put('/fee-config', authenticateToken, authorize(['finance:update']), async (req, res) => {
  try {
    const ConfigManager = require('../utils/configManager');
    
    // Validate the config updates
    ConfigManager.validateConfig({ ...require('../../config/fees'), ...req.body });
    
    // Update configuration
    const newConfig = await ConfigManager.updateFeeConfig(req.body);
    
    res.json({ 
      success: true, 
      message: 'Fee configuration updated successfully',
      config: newConfig 
    });
  } catch (error) {
    console.error('Update fee config error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;