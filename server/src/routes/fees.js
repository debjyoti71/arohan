const express = require('express');
const Joi = require('joi');
const FeeType = require('../models/FeeType');
const ClassFeeStructure = require('../models/ClassFeeStructure');
const StudentFeeCustom = require('../models/StudentFeeCustom');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const Class = require('../models/Class');
const Student = require('../models/Student');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const feeTypeSchema = Joi.object({
  name: Joi.string().required(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'biannual', 'yearly', 'one_time').required(),
  defaultAmount: Joi.number().positive().required(),
  description: Joi.string().allow('').optional()
});

const classFeeStructureSchema = Joi.object({
  classId: Joi.string().required(),
  feeTypeId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  active: Joi.boolean().optional()
});

const paymentSchema = Joi.object({
  payments: Joi.array().items(
    Joi.object({
      feeRecordId: Joi.string().required(),
      amountPaid: Joi.number().positive().required(),
      discount: Joi.number().min(0).optional(),
      discountRemarks: Joi.string().allow('').optional(),
      paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'cheque', 'bank_transfer').optional()
    })
  ).required()
});

// Fee Types Management
router.get('/types', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const feeTypes = await FeeType.find().sort({ name: 1 });
    res.json(feeTypes.map(ft => ({
      ...ft.toObject(),
      feeTypeId: ft._id
    })));
  } catch (error) {
    console.error('Get fee types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/types', authenticateToken, authorize(['fees:create']), async (req, res) => {
  try {
    const { error } = feeTypeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const feeType = await FeeType.create(req.body);
    res.status(201).json({
      ...feeType.toObject(),
      feeTypeId: feeType._id
    });
  } catch (error) {
    console.error('Create fee type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/types/:id', authenticateToken, authorize(['fees:update']), async (req, res) => {
  try {
    const { error } = feeTypeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const feeType = await FeeType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (!feeType) {
      return res.status(404).json({ error: 'Fee type not found' });
    }

    res.json({
      ...feeType.toObject(),
      feeTypeId: feeType._id
    });
  } catch (error) {
    console.error('Update fee type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/types/:id', authenticateToken, authorize(['fees:delete']), async (req, res) => {
  try {
    // Check if fee type is used in class fee structures
    const usageCount = await ClassFeeStructure.countDocuments({ feeTypeId: req.params.id });
    
    if (usageCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete fee type that is assigned to classes. Please remove from classes first.' 
      });
    }

    const deletedFeeType = await FeeType.findByIdAndDelete(req.params.id);
    
    if (!deletedFeeType) {
      return res.status(404).json({ error: 'Fee type not found' });
    }

    res.json({ message: 'Fee type deleted successfully' });
  } catch (error) {
    console.error('Delete fee type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Class Fee Structure Management
router.get('/class-structure', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const { classId } = req.query;
    const filter = classId ? { classId } : {};

    const classFeeStructure = await ClassFeeStructure.find(filter)
      .populate('classId')
      .populate('feeTypeId')
      .sort({ 'classId.className': 1, 'feeTypeId.name': 1 });

    res.json(classFeeStructure.map(cfs => ({
      ...cfs.toObject(),
      classFeeId: cfs._id,
      class: cfs.classId ? { ...cfs.classId.toObject(), classId: cfs.classId._id } : null,
      feeType: cfs.feeTypeId ? { ...cfs.feeTypeId.toObject(), feeTypeId: cfs.feeTypeId._id } : null
    })));
  } catch (error) {
    console.error('Get class fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/class-structure', authenticateToken, authorize(['fees:create']), async (req, res) => {
  try {
    const { error } = classFeeStructureSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const classFeeStructure = await ClassFeeStructure.create(req.body);
    await classFeeStructure.populate(['classId', 'feeTypeId']);

    res.status(201).json({
      ...classFeeStructure.toObject(),
      classFeeId: classFeeStructure._id,
      class: classFeeStructure.classId ? { ...classFeeStructure.classId.toObject(), classId: classFeeStructure.classId._id } : null,
      feeType: classFeeStructure.feeTypeId ? { ...classFeeStructure.feeTypeId.toObject(), feeTypeId: classFeeStructure.feeTypeId._id } : null
    });
  } catch (error) {
    console.error('Create class fee structure error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Fee structure already exists for this class and fee type' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/class-structure/:id', authenticateToken, authorize(['fees:delete']), async (req, res) => {
  try {
    const deletedStructure = await ClassFeeStructure.findByIdAndDelete(req.params.id);
    
    if (!deletedStructure) {
      return res.status(404).json({ error: 'Class fee structure not found' });
    }

    res.json({ message: 'Class fee structure deleted successfully' });
  } catch (error) {
    console.error('Delete class fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee structure for a specific class
router.get('/class/:classId/structure', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const classId = req.params.classId;
    
    const classFeeStructure = await ClassFeeStructure.find({ classId, active: true })
      .populate('feeTypeId')
      .sort({ 'feeTypeId.name': 1 });

    res.json(classFeeStructure.map(cfs => ({
      ...cfs.toObject(),
      feeTypeId: cfs.feeTypeId ? cfs.feeTypeId._id : null,
      feeType: cfs.feeTypeId ? { ...cfs.feeTypeId.toObject(), feeTypeId: cfs.feeTypeId._id } : null
    })));
  } catch (error) {
    console.error('Get class fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get due fees summary
router.get('/due-summary', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          status: { $in: ['unpaid', 'partial'] }
        }
      },
      {
        $group: {
          _id: '$studentId',
          totalDue: {
            $sum: { $subtract: ['$amountDue', '$amountPaid'] }
          }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $project: {
          studentId: '$_id',
          name: '$student.name',
          admissionNo: '$student.admissionNo',
          guardianName: '$student.guardianName',
          guardianContact: '$student.guardianContact',
          totalDue: 1
        }
      },
      {
        $sort: { totalDue: -1 }
      }
    ];

    const dueStudents = await StudentFeeRecord.aggregate(pipeline);
    res.json(dueStudents);
  } catch (error) {
    console.error('Get due fees summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee records
router.get('/records', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const { studentId, status, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;

    const records = await StudentFeeRecord.find(filter)
      .populate('studentId')
      .populate('feeTypeId')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ dueDate: -1 });

    const total = await StudentFeeRecord.countDocuments(filter);

    res.json({
      records: records.map(record => ({
        ...record.toObject(),
        dueAmount: record.amountDue - record.amountPaid,
        student: record.studentId ? {
          ...record.studentId.toObject(),
          studentId: record.studentId._id
        } : null,
        feeType: record.feeTypeId ? {
          ...record.feeTypeId.toObject(),
          feeTypeId: record.feeTypeId._id
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get fee records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate fees for students
router.post('/generate', authenticateToken, authorize(['fees:create']), async (req, res) => {
  try {
    const { month, year, classIds = [] } = req.body;
    
    // Get classes to generate fees for
    const classFilter = classIds.length > 0 ? { _id: { $in: classIds } } : {};
    const classes = await Class.find(classFilter);
    
    let generatedCount = 0;
    
    for (const classObj of classes) {
      // Get students in this class
      const students = await Student.find({ classId: classObj._id });
      
      // Get fee structures for this class
      const feeStructures = await ClassFeeStructure.find({ 
        classId: classObj._id, 
        active: true 
      }).populate('feeTypeId');
      
      for (const student of students) {
        for (const structure of feeStructures) {
          // Check if record already exists
          const existingRecord = await StudentFeeRecord.findOne({
            studentId: student._id,
            feeTypeId: structure.feeTypeId._id,
            month,
            year
          });
          
          if (!existingRecord) {
            await StudentFeeRecord.create({
              studentId: student._id,
              feeTypeId: structure.feeTypeId._id,
              month,
              year,
              amountDue: structure.amount,
              amountPaid: 0,
              status: 'unpaid',
              dueDate: new Date(year, month - 1, 5) // 5th of the month
            });
            generatedCount++;
          }
        }
      }
    }
    
    res.json({ 
      message: `Generated ${generatedCount} fee records successfully`,
      count: generatedCount 
    });
  } catch (error) {
    console.error('Generate fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record payment
router.post('/payment', authenticateToken, authorize(['fees:create']), async (req, res) => {
  try {
    const { payments } = req.body;
    
    for (const payment of payments) {
      const { feeRecordId, amountPaid, discount = 0, discountRemarks = '', paymentMethod = 'cash' } = payment;
      
      const feeRecord = await StudentFeeRecord.findById(feeRecordId);
      if (!feeRecord) {
        return res.status(404).json({ error: `Fee record ${feeRecordId} not found` });
      }

      // Validate discount remarks
      if (discount > 0 && !discountRemarks.trim()) {
        return res.status(400).json({ error: 'Discount remarks are required when discount is applied' });
      }

      const newAmountPaid = feeRecord.amountPaid + amountPaid;
      const status = newAmountPaid >= feeRecord.amountDue ? 'paid' : 'partial';

      await StudentFeeRecord.findByIdAndUpdate(feeRecordId, {
        amountPaid: newAmountPaid,
        status,
        discount: (feeRecord.discount || 0) + discount,
        discountRemarks: discountRemarks || feeRecord.discountRemarks,
        paymentMethod,
        lastPaymentDate: new Date()
      });
    }

    res.json({ message: 'Payment recorded successfully' });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;