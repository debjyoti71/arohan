const feeConfig = require('../../config/fees');
const FeePaymentSummary = require('../models/FeePaymentSummary');
const StudentFeeCustom = require('../models/StudentFeeCustom');

class FeeCalculator {
  static getCurrentAcademicYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (currentMonth >= feeConfig.academicYear.startMonth) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  static calculatePaymentRatio(periodsPaid, totalPeriods) {
    return `${periodsPaid}/${totalPeriods}`;
  }

  static getNextDueDate(frequency, lastPaidPeriod = 0) {
    const config = feeConfig.frequencies[frequency];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (frequency === 'monthly') {
      const nextMonth = now.getMonth() + 1 + lastPaidPeriod;
      return new Date(currentYear, nextMonth, config.dueDayOfMonth);
    }
    
    const dueMonth = config.dueMonths[lastPaidPeriod] || config.dueMonths[0];
    const dueYear = dueMonth < now.getMonth() + 1 ? currentYear + 1 : currentYear;
    return new Date(dueYear, dueMonth - 1, config.dueDayOfMonth);
  }

  static async calculateFeeStatus(studentId, feeTypeId) {
    const academicYear = this.getCurrentAcademicYear();
    
    // Get custom fee settings
    const customFee = await StudentFeeCustom.findOne({
      studentId,
      feeTypeId,
    });

    if (!customFee || !customFee.isApplicable) {
      return null;
    }

    const frequency = customFee.frequency || 'monthly';
    const totalPeriods = feeConfig.frequencies[frequency].periodsPerYear;
    const baseAmount = customFee.customAmount || 0;
    const discountAmount = customFee.discountAmount || 0;
    const totalAmount = (baseAmount * totalPeriods) - discountAmount;

    // Get or create payment summary
    let summary = await FeePaymentSummary.findOne({
      studentId,
      feeTypeId,
      academicYear,
    });

    if (!summary) {
      summary = await FeePaymentSummary.create({
        studentId,
        feeTypeId,
        academicYear,
        frequency,
        totalAmount,
        totalPeriods,
        nextDueDate: this.getNextDueDate(frequency),
      });
    }

    return {
      ...summary.toObject(),
      paymentRatio: this.calculatePaymentRatio(summary.periodsPaid, summary.totalPeriods),
      remainingAmount: totalAmount - summary.paidAmount,
    };
  }

  static async updatePaymentStatus(studentId, feeTypeId, paidAmount) {
    const academicYear = this.getCurrentAcademicYear();
    
    const summary = await FeePaymentSummary.findOne({
      studentId,
      feeTypeId,
      academicYear,
    });

    if (!summary) return null;

    const newPaidAmount = summary.paidAmount + paidAmount;
    const amountPerPeriod = summary.totalAmount / summary.totalPeriods;
    const newPeriodsPaid = Math.floor(newPaidAmount / amountPerPeriod);
    
    let status = 'pending';
    if (newPeriodsPaid >= summary.totalPeriods) {
      status = 'paid';
    } else if (newPeriodsPaid > 0) {
      status = 'partial';
    }

    summary.paidAmount = newPaidAmount;
    summary.periodsPaid = newPeriodsPaid;
    summary.status = status;
    summary.nextDueDate = status === 'paid' ? null : this.getNextDueDate(summary.frequency, newPeriodsPaid);
    
    await summary.save();

    return summary;
  }
}

module.exports = FeeCalculator;