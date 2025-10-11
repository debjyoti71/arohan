const cron = require('node-cron');
const feeConfig = require('../../config/fees');
const FeeCalculator = require('./feeCalculator');
const Student = require('../models/Student');
const ClassFeeStructure = require('../models/ClassFeeStructure');
const FeePaymentSummary = require('../models/FeePaymentSummary');

class AutoFeeGenerator {
  static start() {
    if (!feeConfig.autoGeneration.enabled) return;
    
    const { dayOfMonth, hour, minute } = feeConfig.autoGeneration;
    const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;
    
    cron.schedule(cronExpression, async () => {
      console.log('Running automatic fee generation...');
      await this.generateMonthlyFees();
    });

    console.log(`Auto fee generator started - will run on day ${dayOfMonth} at ${hour}:${minute}`);
  }

  static async generateMonthlyFees() {
    try {
      const academicYear = FeeCalculator.getCurrentAcademicYear();
      
      // Get all active students
      const students = await Student.find({ status: 'active' }).populate('classId');
      
      for (const student of students) {
        if (!student.classId) continue;
        
        // Get class fee structures
        const feeStructures = await ClassFeeStructure.find({
          classId: student.classId._id,
          active: true
        }).populate('feeTypeId');
        
        for (const structure of feeStructures) {
          // Create or update fee payment summary
          await this.createOrUpdateFeeSummary(
            student._id,
            structure.feeTypeId._id,
            structure.feeTypeId.frequency,
            structure.amount,
            academicYear
          );
        }
      }
      
      console.log('Automatic fee generation completed');
    } catch (error) {
      console.error('Error in automatic fee generation:', error);
    }
  }

  static async createOrUpdateFeeSummary(studentId, feeTypeId, frequency, amount, academicYear) {
    const totalPeriods = feeConfig.frequencies[frequency].periodsPerYear;
    const totalAmount = amount * totalPeriods;
    
    // Check if summary already exists
    const existingSummary = await FeePaymentSummary.findOne({
      studentId,
      feeTypeId,
      academicYear
    });
    
    if (!existingSummary) {
      await FeePaymentSummary.create({
        studentId,
        feeTypeId,
        academicYear,
        frequency,
        totalAmount,
        totalPeriods,
        nextDueDate: FeeCalculator.getNextDueDate(frequency)
      });
    }
  }

  // Manual trigger for testing
  static async triggerGeneration() {
    await this.generateMonthlyFees();
  }
}

module.exports = AutoFeeGenerator;