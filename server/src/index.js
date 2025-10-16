const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./utils/database');
const { initSalaryScheduler } = require('./utils/salaryScheduler');
const FeeScheduler = require('./utils/feeScheduler');
const AutoFeeGenerator = require('./utils/autoFeeGenerator');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const staffRoutes = require('./routes/staff');
const classRoutes = require('./routes/classes');
const userRoutes = require('./routes/users');
const feeRoutes = require('./routes/fees');
const dashboardRoutes = require('./routes/dashboard');
const financeRoutes = require('./routes/finance');
const uploadRoutes = require('./routes/upload');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Receipt route (before JSON parsing to handle PDF buffer)
app.get('/api/fees/receipt/:paymentId', require('./routes/fees').receiptHandler);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Arohan School Management System API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize schedulers
initSalaryScheduler();
FeeScheduler.start();
AutoFeeGenerator.start();

app.listen(PORT, () => {
  console.log(`🚀 Arohan School Management System API running on port ${PORT}`);
});

module.exports = app;