const express = require('express');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Class = require('../models/Class');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const [
      totalStudents,
      activeStudents,
      totalStaff,
      totalClasses,
      monthlyFeeCollection,
      outstandingFees
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Staff.countDocuments({ status: 'active' }),
      Class.countDocuments(),
      require('../models/Transaction').aggregate([
        {
          $match: {
            category: 'fees',
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
      ]),
      StudentFeeRecord.aggregate([
        {
          $match: {
            status: { $in: ['unpaid', 'partial'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$amountDue', '$amountPaid'] } }
          }
        }
      ])
    ]);

    res.json({
      totalStudents,
      activeStudents,
      totalStaff,
      totalClasses,
      totalFeesCollected: monthlyFeeCollection[0]?.total || 0,
      outstandingFees: outstandingFees[0]?.total || 0,
      thisMonthExpenses: 0,
      recentPayments: []
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get monthly fee collection chart data
router.get('/fee-collection-chart', authenticateToken, async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const currentYear = new Date().getFullYear();
    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59);
      
      const result = await Transaction.aggregate([
        {
          $match: {
            category: 'fees',
            type: 'income',
            transactionDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      monthlyData.push({
        month: new Date(currentYear, month).toLocaleString('default', { month: 'short' }),
        amount: result[0]?.total || 0
      });
    }

    res.json(monthlyData);
  } catch (error) {
    console.error('Fee collection chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get class-wise student distribution
router.get('/class-distribution', authenticateToken, async (req, res) => {
  try {
    const classes = await Class.find();
    const data = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({ classId: cls._id, status: 'active' });
        return {
          className: cls.className,
          studentCount
        };
      })
    );

    res.json(data);
  } catch (error) {
    console.error('Class distribution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;