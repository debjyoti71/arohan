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
      class: { ...cfs.classId.toObject(), classId: cfs.classId._id },
      feeType: { ...cfs.feeTypeId.toObject(), feeTypeId: cfs.feeTypeId._id }
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
      class: { ...classFeeStructure.classId.toObject(), classId: classFeeStructure.classId._id },
      feeType: { ...classFeeStructure.feeTypeId.toObject(), feeTypeId: classFeeStructure.feeTypeId._id }
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
      feeTypeId: cfs.feeTypeId._id,
      feeType: { ...cfs.feeTypeId.toObject(), feeTypeId: cfs.feeTypeId._id }
    })));
  } catch (error) {
    console.error('Get class fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get due fees summary
router.get('/due-summary', authenticateToken, authorize(['fees:read']), async (req, res) => {
  try {
    const dueFees = await StudentFeeRecord.find({
      status: { $in: ['unpaid', 'partial'] }
    })
    .populate({
      path: 'studentId',
      populate: { path: 'classId' }
    })
    .populate('feeTypeId')
    .sort({ dueDate: 1, 'studentId.name': 1 });

    const summary = dueFees.reduce((acc, record) => {
      const outstanding = record.amountDue - record.amountPaid;
      acc.totalOutstanding += outstanding;
      acc.recordCount += 1;
      return acc;
    }, { totalOutstanding: 0, recordCount: 0 });

    res.json({
      dueFees: dueFees.map(record => ({
        ...record.toObject(),
        feeRecordId: record._id,
        student: {
          ...record.studentId.toObject(),
          studentId: record.studentId._id,
          class: {
            ...record.studentId.classId.toObject(),
            classId: record.studentId.classId._id
          }
        },
        feeType: {
          ...record.feeTypeId.toObject(),
          feeTypeId: record.feeTypeId._id
        }
      })),
      summary
    });
  } catch (error) {
    console.error('Get due fees summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;