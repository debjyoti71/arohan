const mongoose = require('mongoose');
const { migrateFeeData } = require('./src/utils/migrateFeeData');
require('dotenv').config();

async function runMigration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Run migration
    await migrateFeeData();
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();