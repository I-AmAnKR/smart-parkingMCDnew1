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

// CORS Configuration for Render deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      process.env.FRONTEND_URL, // Your Render frontend URL
      /\.onrender\.com$/, // Allow all Render domains
      /localhost:\d+$/ // Allow any localhost port
    ];

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(express.json());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/stats', statsRoutes);


// Health check - shows DB status for diagnostics
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    success: true,
    message: 'Smart Parking API is running',
    timestamp: new Date(),
    database: {
      status: dbStates[dbState] || 'unknown',
      connected: dbState === 1
    },
    env: {
      MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ MISSING',
      PORT: process.env.PORT || '(default 5000)',
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
});

// Debug: Log environment variables
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Defined' : '❌ UNDEFINED - login will fail!');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Defined' : '❌ UNDEFINED - auth will fail!');
if (process.env.MONGODB_URI) {
  console.log('MONGODB_URI starts with:', process.env.MONGODB_URI.substring(0, 30));
}

// MongoDB Connection with retry logic
const MAX_RETRIES = 5;
let retryCount = 0;

// Start HTTP server FIRST so Render health checks pass immediately
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

// Connect to MongoDB with retries
async function connectMongoDB() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set! Please add it in Render Environment Variables.');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
    });
    console.log('✅ Connected to MongoDB Atlas successfully!');
    retryCount = 0;

    // Create demo users after successful connection
    await createDemoUsers();

  } catch (error) {
    retryCount++;
    // Log full error for Render logs
    console.error(`❌ MongoDB connection attempt ${retryCount} failed:`);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    if (error.reason) console.error('   Reason:', JSON.stringify(error.reason));

    if (retryCount < MAX_RETRIES) {
      const delay = Math.min(5000 * retryCount, 30000);
      console.log(`🔄 Retrying MongoDB in ${delay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(connectMongoDB, delay);
    } else {
      console.error('💥 All MongoDB retries exhausted.');
      console.error('💡 Fix: Check MongoDB Atlas Network Access - allow 0.0.0.0/0');
      console.error('💡 Fix: Verify MONGODB_URI env var in Render dashboard');
    }
  }
}

// Diagnostic endpoint - check DB connection on demand
app.get('/api/debug-db', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const info = {
    dbStatus: states[dbState] || 'unknown',
    dbConnected: dbState === 1,
    mongoUriSet: !!process.env.MONGODB_URI,
    jwtSecretSet: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    retryCount,
    timestamp: new Date().toISOString()
  };
  // Try a fresh ping if disconnected
  if (dbState !== 1 && process.env.MONGODB_URI) {
    try {
      await mongoose.connection.db?.admin().ping();
      info.pingResult = 'success';
    } catch (e) {
      info.pingError = e.message;
    }
  }
  res.json(info);
});

connectMongoDB();

// Keep-alive ping every 14 minutes to prevent Render free tier spin-down
// Runs in ALL environments (NODE_ENV may not be 'production' on free Render)
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    try {
      const https = require('https');
      const http = require('http');
      const client = SELF_URL.startsWith('https') ? https : http;
      client.get(`${SELF_URL}/api/health`, (res) => {
        console.log(`💓 Keep-alive ping: ${res.statusCode}`);
      }).on('error', () => {});
    } catch (e) { /* ignore */ }
  }, 14 * 60 * 1000);
  console.log(`💓 Keep-alive enabled → pinging ${SELF_URL} every 14 min`);
}


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