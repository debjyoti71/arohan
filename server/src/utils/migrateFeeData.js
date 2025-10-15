const mongoose = require('mongoose');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const FeePayment = require('../models/FeePayment');
const FeeType = require('../models/FeeType');

async function migrateFeeData() {
  try {
    console.log('Starting fee data migration...');
    
    // Find all fee records that have payments (amountPaid > 0)
    const recordsWithPayments = await StudentFeeRecord.find({
      $or: [
        { amountPaid: { $gt: 0 } },
        { discount: { $gt: 0 } }
      ]
    }).populate('feeTypeId');
    
    console.log(`Found ${recordsWithPayments.length} records with payments to migrate`);
    
    for (const record of recordsWithPayments) {
      // Check if payment record already exists
      const existingPayment = await FeePayment.findOne({ feeRecordId: record._id });
      
      if (!existingPayment && (record.amountPaid > 0 || record.discount > 0)) {
        // Create payment record from existing data
        await FeePayment.create({
          studentId: record.studentId,
          feeRecordId: record._id,
          amountPaid: record.amountPaid || 0,
          discount: record.discount || 0,
          discountRemarks: record.discountRemarks || '',
          paymentMethod: record.paymentMethod || 'cash',
          paymentDate: record.lastPaymentDate || record.paymentDate || record.updatedAt,
          receivedBy: record.receivedBy
        });
        
        console.log(`Migrated payment for record ${record._id}`);
      }
    }
    
    // Update fee records to set frequency to 1 (yearly calculation handled in virtuals)
    const allRecords = await StudentFeeRecord.find({});
    
    for (const record of allRecords) {
      if (!record.frequency) {
        await StudentFeeRecord.findByIdAndUpdate(record._id, { frequency: 1 });
        console.log(`Updated frequency for record ${record._id} to 1`);
      }
    }
    
    console.log('Fee data migration completed successfully!');
    
  } catch (error) {
    console.error('Error during fee data migration:', error);
    throw error;
  }
}

module.exports = { migrateFeeData };