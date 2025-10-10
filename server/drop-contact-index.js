const mongoose = require('mongoose');
require('dotenv').config();

async function dropContactIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    await db.collection('staffs').dropIndex('contact_1');
    console.log('Successfully dropped contact_1 index');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

dropContactIndex();