const express = require('express');
const Joi = require('joi');
const Staff = require('../models/Staff');
const User = require('../models/User');
const Class = require('../models/Class');
const StaffTransaction = require('../models/StaffTransaction');
const { authenticateToken, authorize } = require('../middleware/auth');
const salaryConfig = require('../../config/salary');

const router = express.Router();

// Validation schemas
const staffSchema = Joi.object({
  name: Joi.string().required(),
  role: Joi.string().valid('principal', 'teacher', 'staff').required(),
  qualification: Joi.string().optional(),
  joinDate: Joi.date().required(),
  salary: Joi.number().positive().required(),
  contact: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
});

const transactionSchema = Joi.object({
  staffId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  transactionType: Joi.string().valid('salary', 'bonus', 'deduction').optional(),
  month: Joi.number().min(1).max(12).required(),
  year: Joi.number().min(2020).required(),
  paymentDate: Joi.date().required(),
  remarks: Joi.string().optional()
});

// Get all staff with pagination and filtering
router.get('/', authenticateToken, authorize(['staff:read']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
        { qualification: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (status) filter.status = status;

    const [staff, total] = await Promise.all([
      Staff.find(filter)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Staff.countDocuments(filter)
    ]);

    // Get current salary period
    const currentPeriod = salaryConfig.getCurrentSalaryPeriod();
    
    // Check salary status for each staff member
    const staffWithSalaryStatus = await Promise.all(
      staff.map(async (s) => {
        const salaryTransaction = await StaffTransaction.findOne({
          staffId: s._id,
          month: currentPeriod.month,
          year: currentPeriod.year,
          transactionType: 'salary'
        });
        
        return {
          ...s.toObject(),
          staffId: s._id,
          salaryStatus: salaryTransaction ? 'paid' : 'unpaid'
        };
      })
    );

    res.json({
      staff: staffWithSalaryStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get staff by ID
router.get('/:id', authenticateToken, authorize(['staff:read']), async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({
      ...staff.toObject(),
      staffId: staff._id
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new staff
router.post('/', authenticateToken, authorize(['staff:create']), async (req, res) => {
  try {
    const { error } = staffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const staff = await Staff.create(req.body);

    res.status(201).json({
      ...staff.toObject(),
      staffId: staff._id
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update staff
router.put('/:id', authenticateToken, authorize(['staff:update']), async (req, res) => {
  try {
    const { error } = staffSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({
      ...staff.toObject(),
      staffId: staff._id
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete staff
router.delete('/:id', authenticateToken, authorize(['staff:delete']), async (req, res) => {
  try {
    const staffId = req.params.id;
    
    // Check if staff has associated users
    const userCount = await User.countDocuments({ staffId });
    if (userCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete staff member with associated user accounts. Please delete user accounts first.' 
      });
    }

    // Check if staff is assigned as class teacher
    const classCount = await Class.countDocuments({ classTeacherId: staffId });
    if (classCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete staff member assigned as class teacher. Please reassign classes first.' 
      });
    }

    const deletedStaff = await Staff.findByIdAndDelete(staffId);
    
    if (!deletedStaff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get staff transactions
router.get('/:id/transactions', authenticateToken, authorize(['staff:read']), async (req, res) => {
  try {
    const { page = 1, limit = 10, year, month } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { staffId: req.params.id };
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const [transactions, total] = await Promise.all([
      StaffTransaction.find(filter)
        .populate('staffId')
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ year: -1, month: -1, paymentDate: -1 }),
      StaffTransaction.countDocuments(filter)
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
    console.error('Get staff transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all staff transactions
router.get('/transactions', authenticateToken, authorize(['staff:read']), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      StaffTransaction.find({})
        .populate('staffId')
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ year: -1, month: -1, paymentDate: -1 }),
      StaffTransaction.countDocuments({})
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
    console.error('Get all staff transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add staff transaction
router.post('/transactions', authenticateToken, authorize(['staff:create']), async (req, res) => {
  try {
    const { error } = transactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const transaction = await StaffTransaction.create(req.body);
    await transaction.populate('staffId');

    res.status(201).json({
      ...transaction.toObject(),
      transactionId: transaction._id
    });
  } catch (error) {
    console.error('Create staff transaction error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Transaction already exists for this staff member in the specified month/year' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;