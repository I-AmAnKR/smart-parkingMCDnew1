// backend/routes/auth.js
// Authentication endpoints: login, register

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login endpoint for both contractors and admins
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        parkingLotId: user.parkingLotId,
        parkingLotName: user.parkingLotName,
        maxCapacity: user.maxCapacity
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        email: user.email,
        role: user.role,
        parkingLotId: user.parkingLotId,
        parkingLotName: user.parkingLotName,
        maxCapacity: user.maxCapacity
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login.' 
    });
  }
});

/**
 * POST /api/auth/register
 * Register new user (for testing/setup - can be disabled in production)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, parkingLotId, parkingLotName, maxCapacity } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and role are required.' 
      });
    }

    if (role === 'contractor' && (!parkingLotId || !parkingLotName || !maxCapacity)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contractors must have parking lot details.' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists.' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      role,
      parkingLotId: role === 'contractor' ? parkingLotId : undefined,
      parkingLotName: role === 'contractor' ? parkingLotName : undefined,
      maxCapacity: role === 'contractor' ? maxCapacity : undefined
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration.' 
    });
  }
});

/**
 * GET /api/auth/contractors
 * Get all registered contractors (admin only)
 */
router.get('/contractors', async (req, res) => {
  try {
    // Get authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    // Fetch all contractors
    const contractors = await User.find({ role: 'contractor' })
      .select('-password')  // Exclude password field
      .sort({ createdAt: -1 });  // Most recent first

    res.json({
      success: true,
      contractors: contractors.map(c => ({
        _id: c._id,
        email: c.email,
        parkingLotId: c.parkingLotId,
        parkingLotName: c.parkingLotName,
        maxCapacity: c.maxCapacity,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    console.error('Get contractors error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching contractors.' 
    });
  }
});

module.exports = router;