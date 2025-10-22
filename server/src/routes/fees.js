const express = require('express');
const Joi = require('joi');
const FeeType = require('../models/FeeType');
const ClassFeeStructure = require('../models/ClassFeeStructure');
const StudentFeeCustom = require('../models/StudentFeeCustom');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const FeePayment = require('../models/FeePayment');
const Class = require('../models/Class');
const Student = require('../models/Student');
const User = require('../models/User');
const { authenticateToken, authorize } = require('../middleware/auth');
const { activityLogger } = require('../middleware/activityLogger');
const { generateReceiptPDF } = require('../utils/receiptGenerator');

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
router.get('/types', authenticateToken, async (req, res) => {
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

router.post('/types', authenticateToken, activityLogger('create', 'fee_type'), async (req, res) => {
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

router.put('/types/:id', authenticateToken, activityLogger('update', 'fee_type'), async (req, res) => {
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

router.delete('/types/:id', authenticateToken, activityLogger('delete', 'fee_type'), async (req, res) => {
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
router.get('/class-structure', authenticateToken, async (req, res) => {
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

router.post('/class-structure', authenticateToken, activityLogger('create', 'class_fee_structure'), async (req, res) => {
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

router.delete('/class-structure/:id', authenticateToken, async (req, res) => {
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
router.get('/class/:classId/structure', authenticateToken, async (req, res) => {
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
router.get('/due-summary', authenticateToken, async (req, res) => {
  try {
    const feeRecords = await StudentFeeRecord.find({ status: { $in: ['unpaid', 'partial'] } })
      .populate('studentId')
      .populate('payments');
    
    const studentSummary = {};
    
    for (const record of feeRecords) {
      const studentId = record.studentId._id.toString();
      
      // Calculate yearly amount
      let yearlyAmount;
      if (record.feeTypeId && record.feeTypeId.frequency) {
        switch (record.feeTypeId.frequency) {
          case 'monthly': yearlyAmount = record.amountDue * 12; break;
          case 'quarterly': yearlyAmount = record.amountDue * 4; break;
          case 'biannual': yearlyAmount = record.amountDue * 2; break;
          case 'yearly': yearlyAmount = record.amountDue * 1; break;
          default: yearlyAmount = record.amountDue * 12;
        }
      } else {
        yearlyAmount = record.amountDue * 12;
      }
      
      const totalPaid = record.payments ? record.payments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
      const totalDiscount = record.payments ? record.payments.reduce((sum, p) => sum + p.discount, 0) : 0;
      const remainingAmount = Math.max(0, yearlyAmount - totalPaid - totalDiscount);
      
      if (!studentSummary[studentId]) {
        studentSummary[studentId] = {
          studentId: record.studentId._id,
          name: record.studentId.name,
          admissionNo: record.studentId.admissionNo,
          guardianName: record.studentId.guardianName,
          guardianContact: record.studentId.guardianContact,
          totalDue: 0
        };
      }
      
      studentSummary[studentId].totalDue += remainingAmount;
    }
    
    const dueStudents = Object.values(studentSummary)
      .filter(student => student.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue);
    
    res.json(dueStudents);
  } catch (error) {
    console.error('Get due fees summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get grouped fee collection records
router.get('/collection-records', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $group: {
          _id: {
            studentId: '$studentId',
            paymentDate: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } }
          },
          totalAmount: { $sum: '$amountPaid' },
          totalDiscount: { $sum: '$discount' },
          paymentMethod: { $first: '$paymentMethod' },
          paymentDate: { $first: '$paymentDate' },
          paymentIds: { $push: '$_id' },
          feeCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id.studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      { $sort: { paymentDate: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const collections = await FeePayment.aggregate(pipeline);
    const totalPipeline = [...pipeline.slice(0, -2), { $count: 'total' }];
    const totalResult = await FeePayment.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.json({
      collections: collections.map(collection => ({
        collectionId: `${collection._id.studentId}_${collection._id.paymentDate}`,
        student: {
          name: collection.student.name,
          admissionNo: collection.student.admissionNo,
          className: collection.student.className
        },
        totalAmount: collection.totalAmount,
        totalDiscount: collection.totalDiscount,
        paymentMethod: collection.paymentMethod,
        paymentDate: collection.paymentDate,
        feeCount: collection.feeCount,
        paymentIds: collection.paymentIds
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get collection records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get collection details
router.get('/collection-details/:collectionId', authenticateToken, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const [studentId, paymentDate] = collectionId.split('_');

    const payments = await FeePayment.find({
      studentId,
      paymentDate: {
        $gte: new Date(paymentDate),
        $lt: new Date(new Date(paymentDate).getTime() + 24 * 60 * 60 * 1000)
      }
    })
    .populate({
      path: 'feeRecordId',
      populate: {
        path: 'feeTypeId',
        model: 'FeeType'
      }
    })
    .sort({ createdAt: 1 });

    res.json({
      details: payments.map(payment => ({
        feeType: payment.feeRecordId.feeTypeId.name,
        amountDue: payment.feeRecordId.amountDue,
        amountPaid: payment.amountPaid,
        discount: payment.discount,
        discountRemarks: payment.discountRemarks,
        month: payment.feeRecordId.month,
        year: payment.feeRecordId.year
      })),
      summary: {
        totalDue: payments.reduce((sum, p) => sum + p.feeRecordId.amountDue, 0),
        totalPaid: payments.reduce((sum, p) => sum + p.amountPaid, 0),
        totalDiscount: payments.reduce((sum, p) => sum + p.discount, 0)
      }
    });
  } catch (error) {
    console.error('Get collection details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee records with payments
router.get('/records', authenticateToken, async (req, res) => {
  try {
    const { studentId, status, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;

    const records = await StudentFeeRecord.find(filter)
      .populate('studentId')
      .populate('feeTypeId')
      .populate('payments')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ dueDate: -1 });

    const total = await StudentFeeRecord.countDocuments(filter);

    res.json({
      records: records.map(record => {
        const totalPaid = record.payments ? record.payments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
        const totalDiscount = record.payments ? record.payments.reduce((sum, p) => sum + p.discount, 0) : 0;
        
        // Calculate yearly amount
        let yearlyAmount;
        if (record.feeTypeId && record.feeTypeId.frequency) {
          switch (record.feeTypeId.frequency) {
            case 'monthly': yearlyAmount = record.amountDue * 12; break;
            case 'quarterly': yearlyAmount = record.amountDue * 4; break;
            case 'biannual': yearlyAmount = record.amountDue * 2; break;
            case 'yearly': yearlyAmount = record.amountDue * 1; break;
            default: yearlyAmount = record.amountDue * 12;
          }
        } else {
          yearlyAmount = record.amountDue * 12;
        }
        
        const remainingAmount = Math.max(0, yearlyAmount - totalPaid - totalDiscount);
        
        return {
          ...record.toObject(),
          yearlyAmount,
          totalPaid,
          totalDiscount,
          remainingAmount,
          lastPaymentDate: record.payments && record.payments.length > 0 ? 
            record.payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0].paymentDate : null,
          student: record.studentId ? {
            ...record.studentId.toObject(),
            studentId: record.studentId._id
          } : null,
          feeType: record.feeTypeId ? {
            ...record.feeTypeId.toObject(),
            feeTypeId: record.feeTypeId._id
          } : null
        };
      }),
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
router.post('/generate', authenticateToken, activityLogger('generate', 'fees'), async (req, res) => {
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
            // Frequency is always 1 since we calculate yearly amounts in virtuals
            const frequency = 1;
            
            await StudentFeeRecord.create({
              studentId: student._id,
              feeTypeId: structure.feeTypeId._id,
              month,
              year,
              amountDue: structure.amount,
              frequency,
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
router.post('/payment', authenticateToken, activityLogger('collect', 'fee_payment'), async (req, res) => {
  try {
    console.log('Payment request body:', JSON.stringify(req.body, null, 2));
    
    const { payments } = req.body;
    
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'Payments array is required and must not be empty' });
    }
    
    const Transaction = require('../models/Transaction');
    const Account = require('../models/Account');
    
    let lastPaymentId = null;
    const createdPayments = [];
    
    for (const payment of payments) {
      const { feeRecordId, amountPaid, discount = 0, discountRemarks = '', paymentMethod = 'cash' } = payment;
      
      console.log('Processing payment:', { feeRecordId, amountPaid, discount, discountRemarks });
      
      if (!feeRecordId) {
        return res.status(400).json({ error: 'Fee record ID is required' });
      }
      
      if (!amountPaid || amountPaid <= 0) {
        return res.status(400).json({ error: 'Amount paid must be greater than 0' });
      }
      
      const feeRecord = await StudentFeeRecord.findById(feeRecordId)
        .populate('studentId')
        .populate('feeTypeId')
        .populate('payments');
        
      if (!feeRecord) {
        return res.status(404).json({ error: `Fee record ${feeRecordId} not found` });
      }

      // Validate discount remarks only if discount > 0
      if (discount > 0 && (!discountRemarks || !discountRemarks.toString().trim())) {
        return res.status(400).json({ error: 'Discount remarks are required when discount is applied' });
      }

      // Create new payment record
      const newPayment = await FeePayment.create({
        studentId: feeRecord.studentId._id,
        feeRecordId: feeRecordId,
        amountPaid,
        discount,
        discountRemarks,
        paymentMethod,
        paymentDate: new Date(),
        receivedBy: req.user.userId
      });
      
      lastPaymentId = newPayment._id;
      createdPayments.push(newPayment._id);
      console.log('Created payment with ID:', lastPaymentId);
      
      // Update fee record status
      const allPayments = await FeePayment.find({ feeRecordId });
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amountPaid, 0);
      const totalDiscount = allPayments.reduce((sum, p) => sum + p.discount, 0);
      
      // Calculate yearly amount based on fee type
      let yearlyAmount;
      switch (feeRecord.feeTypeId.frequency) {
        case 'monthly': yearlyAmount = feeRecord.amountDue * 12; break;
        case 'quarterly': yearlyAmount = feeRecord.amountDue * 4; break;
        case 'biannual': yearlyAmount = feeRecord.amountDue * 2; break;
        case 'yearly': yearlyAmount = feeRecord.amountDue * 1; break;
        default: yearlyAmount = feeRecord.amountDue * 12;
      }
      
      const status = (totalPaid + totalDiscount) >= yearlyAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

      await StudentFeeRecord.findByIdAndUpdate(feeRecordId, { status });
      
      console.log('Created payment record:', newPayment._id);

      // Create corresponding transaction record
      try {
        const cashAccount = await Account.findOne({ type: 'cash' });
        
        if (cashAccount) {
          await Transaction.create({
            type: 'income',
            category: 'fees',
            amount: amountPaid,
            description: `Fee collection from ${feeRecord.studentId?.name || 'Student'}`,
            toAccount: cashAccount._id,
            transactionDate: new Date(),
            referenceNumber: `FEE-${newPayment._id}`,
            createdBy: req.user.userId
          });

          await Account.findByIdAndUpdate(cashAccount._id, {
            $inc: { balance: amountPaid }
          });
        }
      } catch (transactionError) {
        console.error('Error creating transaction for fee payment:', transactionError);
      }
    }

    console.log('All created payment IDs:', createdPayments);
    
    res.json({ 
      message: 'Payment recorded successfully',
      paymentIds: createdPayments.map(id => id.toString())
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Process payment with fee structure (for fee collection page)
router.post('/process-payment', authenticateToken, async (req, res) => {
  try {
    const { studentId, feeTypeId, amount, paymentMethod = 'cash', discount = 0, discountRemarks = '' } = req.body;
    
    // Find or create fee record for current month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    let feeRecord = await StudentFeeRecord.findOne({
      studentId,
      feeTypeId,
      month: currentMonth.toString(),
      year: currentYear
    });
    
    if (!feeRecord) {
      // Get fee structure to determine amount due
      const student = await Student.findById(studentId).populate('classId');
      const feeStructure = await ClassFeeStructure.findOne({
        classId: student.classId,
        feeTypeId,
        active: true
      });
      
      if (!feeStructure) {
        return res.status(404).json({ error: 'Fee structure not found for this student and fee type' });
      }
      
      // Create new fee record
      feeRecord = await StudentFeeRecord.create({
        studentId,
        feeTypeId,
        month: currentMonth.toString(),
        year: currentYear,
        amountDue: feeStructure.amount,
        amountPaid: 0,
        status: 'unpaid',
        dueDate: new Date(currentYear, currentMonth - 1, 5)
      });
    }
    
    // Update payment
    const newAmountPaid = feeRecord.amountPaid + amount;
    const status = newAmountPaid >= feeRecord.amountDue ? 'paid' : 'partial';
    
    const updatedRecord = await StudentFeeRecord.findByIdAndUpdate(feeRecord._id, {
      amountPaid: newAmountPaid,
      status,
      discount: (feeRecord.discount || 0) + discount,
      discountRemarks: discountRemarks || feeRecord.discountRemarks,
      paymentMethod,
      lastPaymentDate: new Date()
    }, { new: true });
    
    res.json({
      message: 'Payment processed successfully',
      paymentId: updatedRecord._id,
      record: updatedRecord
    });
    
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Receipt handler (exported separately for use before JSON middleware)
const receiptHandler = async (req, res) => {
  try {
    const { authenticateToken, authorize } = require('../middleware/auth');
    
    // Apply auth middleware manually
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      authorize(['fees:read'])(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('Full request params:', req.params);
    console.log('Request URL:', req.url);
    
    // Handle both paymentId and paymentIds parameters for backward compatibility
    const paymentIds = req.params.paymentIds || req.params.paymentId;
    
    console.log('Looking for payment IDs:', paymentIds);
    
    if (!paymentIds) {
      return res.status(400).json({ error: 'Payment IDs are required' });
    }
    
    const paymentIdArray = paymentIds.split(',');
    
    const payments = await FeePayment.find({ _id: { $in: paymentIdArray } })
      .populate('studentId')
      .populate({
        path: 'feeRecordId',
        populate: {
          path: 'feeTypeId',
          model: 'FeeType'
        }
      });
    
    if (!payments || payments.length === 0) {
      console.error('No payment records found for IDs:', paymentIds);
      return res.status(404).json({ error: 'Payment record not found' });
    }
    
    console.log('Found payments:', payments.length);
    
    const firstPayment = payments[0];
    
    if (!firstPayment.studentId || !firstPayment.feeRecordId || !firstPayment.feeRecordId.feeTypeId) {
      console.error('Missing data in first payment');
      return res.status(400).json({ error: 'Invalid payment record - missing student or fee type data' });
    }
    
    const user = await User.findById(req.user.userId);
    const staffName = user?.username || 'System';
    
    const receiptNumber = `RCPT-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}-${firstPayment._id.toString().slice(-6).toUpperCase()}`;
    
    // Aggregate data from all payments
    const totalAmount = payments.reduce((sum, p) => sum + (p.feeRecordId.amountDue || 0), 0);
    const totalDiscount = payments.reduce((sum, p) => sum + (p.discount || 0), 0);
    const totalAmountPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    
    const receiptData = {
      receiptNumber,
      date: new Date(firstPayment.paymentDate || firstPayment.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: new Date(firstPayment.paymentDate || firstPayment.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      student: firstPayment.studentId.name || 'Unknown Student',
      guardian: firstPayment.studentId.guardianName || 'Unknown Guardian',
      admissionNumber: firstPayment.studentId.admissionNumber || firstPayment.studentId.admissionNo || 'N/A',
      className: firstPayment.studentId.className || firstPayment.studentId.class?.className || 'N/A',
      feeBreakdown: payments.map(payment => ({
        name: payment.feeRecordId.feeTypeId.name || 'Fee Payment',
        amountPaid: payment.amountPaid || 0,
        discount: payment.discount || 0,
        paymentRatio: 'N/A'
      })),
      totalAmount,
      discount: totalDiscount,
      amountPaid: totalAmountPaid,
      balanceDue: totalAmount - totalAmountPaid,
      paymentMethod: firstPayment.paymentMethod || 'Cash',
      staffName
    };
    
    console.log('Receipt data:', JSON.stringify(receiptData, null, 2));
    
    console.log('Calling generateReceiptPDF...');
    const pdfBuffer = await generateReceiptPDF(receiptData);
    console.log('PDF buffer received, type:', typeof pdfBuffer);
    console.log('PDF buffer length:', pdfBuffer ? pdfBuffer.length : 'null/undefined');
    console.log('PDF buffer is Buffer?', Buffer.isBuffer(pdfBuffer));
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('PDF buffer is empty or null');
      throw new Error('Generated PDF buffer is empty');
    }
    
    console.log('Converting PDF to Buffer...');
    const buffer = Buffer.from(pdfBuffer);
    console.log('Buffer created, size:', buffer.length);
    
    console.log('Setting response headers...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receiptNumber}.pdf"`);
    
    console.log('Sending PDF buffer to client...');
    res.send(buffer);
    console.log('PDF response sent successfully');
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt', details: error.message });
  }
};

// Get student fee summary for payment collection
router.get('/student-summary/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student's customized fee structure
    const StudentFeeCustom = require('../models/StudentFeeCustom');
    const customFees = await StudentFeeCustom.find({ studentId }).populate('feeTypeId');
    
    const feeRecords = await StudentFeeRecord.find({ studentId })
      .populate('feeTypeId')
      .populate('payments');
    
    const summary = feeRecords.map(record => {
      const totalPaid = record.payments ? record.payments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
      const totalDiscount = record.payments ? record.payments.reduce((sum, p) => sum + p.discount, 0) : 0;
      
      // Get customized amount if exists
      const customFee = customFees.find(cf => cf.feeTypeId._id.toString() === record.feeTypeId._id.toString());
      const actualAmount = customFee?.customAmount || record.amountDue;
      
      // Calculate yearly amount using customized amount
      let yearlyAmount;
      switch (record.feeTypeId.frequency) {
        case 'monthly': yearlyAmount = actualAmount * 12; break;
        case 'quarterly': yearlyAmount = actualAmount * 4; break;
        case 'biannual': yearlyAmount = actualAmount * 2; break;
        case 'yearly': yearlyAmount = actualAmount * 1; break;
        default: yearlyAmount = actualAmount * 12;
      }
      
      const remainingAmount = Math.max(0, yearlyAmount - totalPaid - totalDiscount);
      
      // Calculate months paid using customized amount
      const monthsPaid = Math.floor((totalPaid + totalDiscount) / actualAmount);
      let totalMonths;
      switch (record.feeTypeId.frequency) {
        case 'monthly': totalMonths = 12; break;
        case 'quarterly': totalMonths = 4; break;
        case 'biannual': totalMonths = 2; break;
        case 'yearly': totalMonths = 1; break;
        default: totalMonths = 12;
      }
      
      return {
        feeTypeId: record.feeTypeId._id,
        feeType: record.feeTypeId.name,
        frequency: record.feeTypeId.frequency,
        amountDue: actualAmount,
        yearlyAmount,
        totalPaid,
        totalDiscount,
        remainingAmount,
        monthsPaid: Math.min(monthsPaid, totalMonths),
        totalMonths,
        paymentRatio: `${Math.min(monthsPaid, totalMonths)}/${totalMonths}`,
        status: record.status,
        recordId: record._id
      };
    });
    
    res.json(summary);
  } catch (error) {
    console.error('Get student fee summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route to debug parameter capture
router.get('/receipt-test/:paymentIds', (req, res) => {
  console.log('Test route - Full params:', req.params);
  console.log('Test route - paymentIds:', req.params.paymentIds);
  res.json({ paymentIds: req.params.paymentIds });
});

// Generate receipt PDF
router.get('/receipt/:paymentIds', receiptHandler);

module.exports = router;
module.exports.receiptHandler = receiptHandler;