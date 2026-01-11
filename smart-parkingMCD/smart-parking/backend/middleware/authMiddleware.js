// backend/middleware/authMiddleware.js
// JWT verification middleware for protecting routes

const jwt = require('jsonwebtoken');

// Verify JWT token from Authorization header
const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
};

// Middleware to check if user has admin role
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin only.' 
    });
  }
  next();
};

// Middleware to check if user has contractor role
const contractorOnly = (req, res, next) => {
  if (req.user.role !== 'contractor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Contractor only.' 
    });
  }
  next();
};

module.exports = { authMiddleware, adminOnly, contractorOnly };