// backend/server.js
// Main Express server setup

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Import routes
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const notificationRoutes = require('./routes/notifications');
const contractorRoutes = require('./routes/contractors');
const statsRoutes = require('./routes/stats');

// Debug routes
console.log('authRoutes type:', typeof authRoutes);
console.log('parkingRoutes type:', typeof parkingRoutes);

// Import models
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Middleware
app.use(cors()); // Allow all origins for development

app.options("*", cors()); // handle preflight requests
app.use(express.json());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Parking API is running',
    timestamp: new Date()
  });
});

// Debug: Log environment variables
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');
if (process.env.MONGODB_URI) {
  console.log('MONGODB_URI starts with:', process.env.MONGODB_URI.substring(0, 20));
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Create demo users if they don't exist
    await createDemoUsers();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

/**
 * Create demo users for hackathon demonstration
 */
async function createDemoUsers() {
  try {
    // Check if users already exist
    const adminExists = await User.findOne({ email: 'admin@mcd.gov.in' });
    const contractor1Exists = await User.findOne({ email: 'contractor@parking.com' });

    if (!adminExists) {
      const admin = new User({
        email: 'admin@mcd.gov.in',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Created demo admin user');
    }

    if (!contractor1Exists) {
      const contractor1 = new User({
        email: 'contractor@parking.com',
        password: await bcrypt.hash('contractor123', 10),
        role: 'contractor',
        parkingLotId: 'LOT001',
        parkingLotName: 'Connaught Place Parking',
        maxCapacity: 50
      });
      await contractor1.save();
      console.log('✅ Created demo contractor user (LOT001)');
    }

    // Create additional demo contractors
    const contractor2Exists = await User.findOne({ email: 'contractor2@parking.com' });
    if (!contractor2Exists) {
      const contractor2 = new User({
        email: 'contractor2@parking.com',
        password: await bcrypt.hash('contractor123', 10),
        role: 'contractor',
        parkingLotId: 'LOT002',
        parkingLotName: 'Karol Bagh Parking',
        maxCapacity: 40
      });
      await contractor2.save();
      console.log('✅ Created demo contractor user (LOT002)');
    }

    const contractor3Exists = await User.findOne({ email: 'contractor3@parking.com' });
    if (!contractor3Exists) {
      const contractor3 = new User({
        email: 'contractor3@parking.com',
        password: await bcrypt.hash('contractor123', 10),
        role: 'contractor',
        parkingLotId: 'LOT003',
        parkingLotName: 'Saket Metro Parking',
        maxCapacity: 60
      });
      await contractor3.save();
      console.log('✅ Created demo contractor user (LOT003)');
    }

    console.log('\n📋 Demo Login Credentials:');
    console.log('Admin: admin@mcd.gov.in / admin123');
    console.log('Contractor: contractor@parking.com / contractor123\n');
  } catch (error) {
    console.error('Error creating demo users:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\n👋 Server shutdown complete');
  process.exit(0);
});