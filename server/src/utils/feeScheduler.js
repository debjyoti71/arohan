const cron = require('node-cron');
const feeConfig = require('../../config/fees');
const FeeCalculator = require('./feeCalculator');
const FeePaymentSummary = require('../models/FeePaymentSummary');

class FeeScheduler {
  static start() {
    const { dayOfMonth, hour, minute } = feeConfig.autoGeneration;
    
    // Schedule runs on configured day of month at configured time
    const cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;
    
    cron.schedule(cronExpression, async () => {
      console.log('Running fee recalculation...');
      await this.recalculateOverdueFees();
    });

    console.log(`Fee scheduler started - will run on day ${dayOfMonth} at ${hour}:${minute}`);
  }

  static async recalculateOverdueFees() {
    try {
      const now = new Date();
      const gracePeriodDate = new Date(now.getTime() - (feeConfig.gracePeriod.days * 24 * 60 * 60 * 1000));

      // Find all summaries with due dates passed grace period
      const overdueSummaries = await FeePaymentSummary.find({
        nextDueDate: { $lt: gracePeriodDate },
        status: { $in: ['pending', 'partial'] },
      });

      for (const summary of overdueSummaries) {
        summary.status = 'overdue';
        await summary.save();
      }

      console.log(`Updated ${overdueSummaries.length} fees to overdue status`);
    } catch (error) {
      console.error('Error in fee recalculation:', error);
    }
  }

  // Manual trigger for testing
  static async triggerRecalculation() {
    await this.recalculateOverdueFees();
  }
}

module.exports = FeeScheduler;