const express = require('express');
const Joi = require('joi');
const Student = require('../models/Student');
const Class = require('../models/Class');
const ClassFeeStructure = require('../models/ClassFeeStructure');
const StudentFeeCustom = require('../models/StudentFeeCustom');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const studentSchema = Joi.object({
  admissionNo: Joi.string().required(),
  name: Joi.string().required(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').allow('').optional(),
  dateOfAdmission: Joi.date().optional(),
  email: Joi.string().email().allow('').optional(),
  aadhar: Joi.string().length(12).allow('').optional(),
  classId: Joi.string().required(),
  guardianName: Joi.string().optional(),
  guardianContact: Joi.string().optional(),
  guardianOccupation: Joi.string().allow('').optional(),
  guardianQualification: Joi.string().allow('').optional(),
  address: Joi.string().optional(),
  profileImage: Joi.string().allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'passed', 'left').optional()
});

// Get all students with pagination and filtering
router.get('/', authenticateToken, authorize(['students:read']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, classId, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { admissionNo: { $regex: search, $options: 'i' } },
        { guardianName: { $regex: search, $options: 'i' } }
      ];
    }
    if (classId) filter.classId = classId;
    if (status) filter.status = status;

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('classId')
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Student.countDocuments(filter)
    ]);

    res.json({
      students: students.map(student => ({
        ...student.toObject(),
        studentId: student._id,
        class: student.classId ? { ...student.classId.toObject(), classId: student.classId._id } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student by ID
router.get('/:id', authenticateToken, authorize(['students:read']), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('classId');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      ...student.toObject(),
      studentId: student._id,
      class: student.classId ? { ...student.classId.toObject(), classId: student.classId._id } : null
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new student
router.post('/', authenticateToken, authorize(['students:create']), async (req, res) => {
  try {
    const { error } = studentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const student = await Student.create(req.body);
    await student.populate('classId');

    // Create default fee structure for the student
    const classFeeStructure = await ClassFeeStructure.find({ classId: student.classId, active: true });

    for (const fee of classFeeStructure) {
      await StudentFeeCustom.create({
        studentId: student._id,
        feeTypeId: fee.feeTypeId,
        isApplicable: true
      });
    }

    res.status(201).json({
      ...student.toObject(),
      studentId: student._id,
      class: student.classId ? { ...student.classId.toObject(), classId: student.classId._id } : null
    });
  } catch (error) {
    console.error('Create student error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Admission number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
router.put('/:id', authenticateToken, authorize(['students:update']), async (req, res) => {
  try {
    const { error } = studentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('classId');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      ...student.toObject(),
      studentId: student._id,
      class: student.classId ? { ...student.classId.toObject(), classId: student.classId._id } : null
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
router.delete('/:id', authenticateToken, authorize(['students:delete']), async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    
    if (!deletedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student fee structure
router.put('/:id/fee-structure', authenticateToken, authorize(['students:update']), async (req, res) => {
  try {
    const studentId = req.params.id;
    const { customizations } = req.body;

    // Get student's class to fetch default fee structure
    const student = await Student.findById(studentId).populate('classId');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const classFeeStructure = await ClassFeeStructure.find({ classId: student.classId, active: true });

    for (const fee of customizations) {
      // Find default amount for this fee type
      const defaultFee = classFeeStructure.find(cf => cf.feeTypeId.toString() === fee.feeTypeId.toString());
      const defaultAmount = defaultFee ? defaultFee.amount : 0;
      
      // Validate remarks requirement
      if (fee.customAmount !== defaultAmount && (!fee.remarks || fee.remarks.trim() === '')) {
        return res.status(400).json({ 
          error: `Remarks are required when changing fee amount from default value` 
        });
      }

      await StudentFeeCustom.findOneAndUpdate(
        { studentId, feeTypeId: fee.feeTypeId },
        {
          customAmount: fee.customAmount,
          isApplicable: fee.isApplicable,
          remarks: fee.remarks
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Fee structure updated successfully' });
  } catch (error) {
    console.error('Update fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student fee structure
router.get('/:id/fee-structure', authenticateToken, authorize(['students:read']), async (req, res) => {
  try {
    const studentId = req.params.id;
    
    const student = await Student.findById(studentId).populate('classId');
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentFeeCustom = await StudentFeeCustom.find({ studentId }).populate('feeTypeId');

    res.json(studentFeeCustom.map(custom => ({
      ...custom.toObject(),
      feeTypeId: custom.feeTypeId._id,
      feeType: { ...custom.feeTypeId.toObject(), feeTypeId: custom.feeTypeId._id }
    })));
  } catch (error) {
    console.error('Get fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;