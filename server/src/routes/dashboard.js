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
    const [
      totalStudents,
      activeStudents,
      totalStaff,
      totalClasses
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Staff.countDocuments({ status: 'active' }),
      Class.countDocuments()
    ]);

    res.json({
      totalStudents,
      activeStudents,
      totalStaff,
      totalClasses,
      totalFeesCollected: 0,
      outstandingFees: 0,
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
    const monthlyData = Array.from({ length: 12 }, (_, month) => ({
      month: new Date(2024, month).toLocaleString('default', { month: 'short' }),
      amount: 0
    }));

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