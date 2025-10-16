const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const Student = require('../models/Student');
const Class = require('../models/Class');
const StudentFeeRecord = require('../models/StudentFeeRecord');
const ClassFeeStructure = require('../models/ClassFeeStructure');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Get fees configuration
router.get('/fees', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/fees.js');
    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load fees configuration', error: error.message });
  }
});

// Update fees configuration
router.put('/fees', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/fees.js');
    const configContent = `module.exports = ${JSON.stringify(req.body, null, 2)};`;
    await fs.writeFile(configPath, configContent);
    res.json({ message: 'Fees configuration updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update fees configuration', error: error.message });
  }
});

// Get salary configuration
router.get('/salary', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/salary.js');
    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load salary configuration', error: error.message });
  }
});

// Update salary configuration
router.put('/salary', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/salary.js');
    const configContent = `module.exports = ${JSON.stringify(req.body, null, 2)};`;
    await fs.writeFile(configPath, configContent);
    res.json({ message: 'Salary configuration updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update salary configuration', error: error.message });
  }
});

// Get year progression configuration
router.get('/year-progression', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/yearProgression.js');
    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load year progression configuration', error: error.message });
  }
});

// Update year progression configuration
router.put('/year-progression', authenticateToken, async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../../config/yearProgression.js');
    const configContent = `module.exports = ${JSON.stringify(req.body, null, 2)};`;
    await fs.writeFile(configPath, configContent);
    res.json({ message: 'Year progression configuration updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update year progression configuration', error: error.message });
  }
});

// Year promotion with Google Sheets export
router.post('/promote-year', authenticateToken, async (req, res) => {
  console.log('=== YEAR PROMOTION STARTED ===');
  try {
    // Get all active students with outstanding fees
    const students = await Student.find({ status: 'active' }).populate('classId');
    console.log(`Found ${students.length} active students`);
    
    if (students.length === 0) {
      return res.json({ 
        message: 'No active students found for promotion',
        promotedStudents: 0,
        graduatedStudents: 0,
        outstandingFeesExported: 0,
        sheetsExported: false,
        sheetsExportEnabled: false
      });
    }
    const outstandingFees = await StudentFeeRecord.find({
      studentId: { $in: students.map(s => s._id) },
      status: { $in: ['unpaid', 'partial'] }
    }).populate('studentId feeTypeId');
    console.log(`Found ${outstandingFees.length} outstanding fee records`);

    // Prepare comprehensive data for Google Sheets export
    const sheetData = [];
    const studentFeeMap = new Map();
    
    // Initialize all students in the map
    students.forEach(student => {
      studentFeeMap.set(student._id.toString(), {
        studentName: student.name,
        admissionNo: student.admissionNo,
        className: student.classId?.className || 'No Class',
        fatherName: student.fatherName || '',
        motherName: student.motherName || '',
        contactNumber: student.contactNumber || '',
        address: student.address || '',
        totalOutstanding: 0,
        fees: []
      });
    });
    
    // Add fee details for students with outstanding fees
    outstandingFees.forEach(fee => {
      const studentId = fee.studentId._id.toString();
      const studentData = studentFeeMap.get(studentId);
      if (studentData) {
        studentData.totalOutstanding += fee.amountDue;
        studentData.fees.push({
          feeType: fee.feeTypeId.name,
          amount: fee.amountDue,
          dueDate: fee.dueDate,
          month: fee.month
        });
      }
    });

    // Convert to sheet format with all student data
    studentFeeMap.forEach(data => {
      sheetData.push({
        'Student Name': data.studentName,
        'Admission No': data.admissionNo,
        'Current Class': data.className,
        'Father Name': data.fatherName,
        'Mother Name': data.motherName,
        'Contact Number': data.contactNumber,
        'Address': data.address,
        'Total Outstanding Fees': data.totalOutstanding,
        'Outstanding Fee Details': data.fees.length > 0 ? 
          data.fees.map(f => `${f.feeType}: ₹${f.amount} (${f.month})`).join('; ') : 
          'No Outstanding Fees',
        'Export Date': new Date().toLocaleDateString(),
        'Export Time': new Date().toLocaleTimeString()
      });
    });

    // Export to Google Sheets (basic implementation)
    let sheetsExported = false;
    try {
      if (process.env.GOOGLE_SHEETS_ENABLED === 'true' && 
          process.env.GOOGLE_SHEET_ID && 
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
          process.env.GOOGLE_PRIVATE_KEY) {
        
        // Initialize Google Sheets (requires service account credentials)
        const serviceAccountAuth = new JWT({
          email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        
        const sheet = doc.sheetsByIndex[0];
        await sheet.clear();
        if (sheetData.length > 0) {
          await sheet.setHeaderRow(Object.keys(sheetData[0]));
          await sheet.addRows(sheetData);
        }
        sheetsExported = true;
      }
    } catch (sheetError) {
      console.warn('Google Sheets export failed:', sheetError.message);
      // Continue with promotion even if sheets export fails
    }

    // Load year progression configuration
    const configPath = path.join(__dirname, '../../config/yearProgression.js');
    delete require.cache[require.resolve(configPath)];
    const yearConfig = require(configPath);
    
    // Get all classes for promotion logic
    const classes = await Class.find().sort({ className: 1 });
    const classMap = new Map();
    
    console.log('Available classes:', classes.map(c => ({ id: c._id, name: c.className })));
    console.log('Year progression config:', yearConfig.progressionMap);
    
    // Create promotion mapping using configuration
    classes.forEach(cls => {
      const nextClassName = yearConfig.progressionMap[cls.className];
      if (nextClassName) {
        const nextClass = classes.find(c => c.className === nextClassName);
        if (nextClass) {
          classMap.set(cls._id.toString(), nextClass._id);
          console.log(`Mapping class ${cls.className} -> ${nextClass.className}`);
        } else {
          console.warn(`Next class "${nextClassName}" not found for "${cls.className}"`);
        }
      } else if (nextClassName === null) {
        console.log(`Class ${cls.className} is final class (graduation)`);
      }
    });
    
    console.log('Class promotion map:', Array.from(classMap.entries()));

    let promotedCount = 0;
    let graduatedCount = 0;

    // Promote students to next class
    for (const student of students) {
      const currentClassId = student.classId._id.toString();
      const nextClassId = classMap.get(currentClassId);
      
      console.log(`Processing student ${student.name} in class ${student.classId.className}`);
      
      if (nextClassId) {
        console.log(`Promoting student ${student.name} to next class`);
        
        // Promote to next class
        await Student.findByIdAndUpdate(student._id, { classId: nextClassId });
        
        // Update fee structure for new class
        const newClassFeeStructure = await ClassFeeStructure.find({ classId: nextClassId });
        
        console.log(`Found ${newClassFeeStructure.length} fee structures for new class`);
        
        // Always generate new fee records for the promoted class
        for (const feeStructure of newClassFeeStructure) {
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1;
          const currentYear = currentDate.getFullYear();
          
          await StudentFeeRecord.create({
            studentId: student._id,
            feeTypeId: feeStructure.feeTypeId,
            amountDue: feeStructure.amount,
            year: currentYear,
            dueDate: new Date(currentYear, currentMonth, 5), // 5th of next month
            month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
            status: 'unpaid'
          });
          console.log(`Generated fee record: ${feeStructure.feeTypeId} - ₹${feeStructure.amount} for ${student.name}`);
        }
        
        promotedCount++;
      } else {
        console.log(`No next class found for ${student.classId.className}, marking as graduated`);
        // Always mark as graduated if no next class
        await Student.findByIdAndUpdate(student._id, { 
          status: 'passed'
        });
        graduatedCount++;
      }
    }
    
    console.log(`Promotion completed: ${promotedCount} promoted, ${graduatedCount} graduated`);
    console.log('=== YEAR PROMOTION COMPLETED ===');

    res.json({ 
      message: 'Year promotion completed successfully',
      promotedStudents: promotedCount,
      graduatedStudents: graduatedCount,
      outstandingFeesExported: sheetData.length,
      sheetsExported: sheetsExported,
      sheetsExportEnabled: process.env.GOOGLE_SHEETS_ENABLED === 'true'
    });

  } catch (error) {
    console.error('=== YEAR PROMOTION ERROR ===');
    console.error('Year promotion error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to promote year', error: error.message });
  }
});

module.exports = router;