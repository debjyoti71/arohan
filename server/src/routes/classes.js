const express = require('express');
const Joi = require('joi');
const Class = require('../models/Class');
const Staff = require('../models/Staff');
const Student = require('../models/Student');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const classSchema = Joi.object({
  className: Joi.string().required(),
  classTeacherId: Joi.string().allow(null, '').optional()
});

// Get all classes
router.get('/', authenticateToken, authorize(['classes:read']), async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('classTeacherId')
      .sort({ className: 1 });
    
    // Add student count
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({ classId: cls._id, status: 'active' });
        return {
          ...cls.toObject(),
          classId: cls._id,
          classTeacher: cls.classTeacherId,
          _count: { students: studentCount }
        };
      })
    );

    res.json(classesWithCount);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get class by ID
router.get('/:id', authenticateToken, authorize(['classes:read']), async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('classTeacherId');
    
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const students = await Student.find({ classId: classData._id, status: 'active' });
    
    res.json({
      ...classData.toObject(),
      classId: classData._id,
      classTeacher: classData.classTeacherId,
      students
    });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new class
router.post('/', authenticateToken, authorize(['classes:create']), async (req, res) => {
  try {
    const { error } = classSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Convert empty string to null for classTeacherId
    const classData = await Class.create({
      ...req.body,
      classTeacherId: req.body.classTeacherId || null
    });
    await classData.populate('classTeacherId');

    res.status(201).json({
      ...classData.toObject(),
      classId: classData._id,
      classTeacher: classData.classTeacherId
    });
  } catch (error) {
    console.error('Create class error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Class name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update class
router.put('/:id', authenticateToken, authorize(['classes:update']), async (req, res) => {
  try {
    const { error } = classSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const classData = await Class.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        classTeacherId: req.body.classTeacherId || null
      },
      { new: true }
    ).populate('classTeacherId');

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({
      ...classData.toObject(),
      classId: classData._id,
      classTeacher: classData.classTeacherId
    });
  } catch (error) {
    console.error('Update class error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Class name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete class
router.delete('/:id', authenticateToken, authorize(['classes:delete']), async (req, res) => {
  try {
    const classId = req.params.id;
    
    // Check if class has students
    const studentCount = await Student.countDocuments({ classId, status: 'active' });

    if (studentCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class with active students. Please transfer students first.' 
      });
    }

    const deletedClass = await Class.findByIdAndDelete(classId);
    
    if (!deletedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available teachers for class assignment
router.get('/available/teachers', authenticateToken, authorize(['classes:read']), async (req, res) => {
  try {
    const availableTeachers = await Staff.find({
      role: { $in: ['teacher', 'principal'] },
      status: 'active'
    }).select('name role');

    res.json(availableTeachers.map(teacher => ({
      staffId: teacher._id,
      name: teacher.name,
      role: teacher.role
    })));
  } catch (error) {
    console.error('Get available teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;