const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const facilityRoutes = require('./routes/facilityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');

// API Mount Points
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Base route for server status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'College Facilities Booking Platform API is running.',
    mode: global.useMockDb ? 'mock-json-db' : 'mongodb-active'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // First connect to DB (Mongoose or Fallback to Mock)
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${global.useMockDb ? 'JSON mock' : 'Mongo'} database mode.`);
  });
};

startServer();
