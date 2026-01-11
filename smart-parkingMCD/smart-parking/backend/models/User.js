// backend/models/User.js
// User model for authentication and role management

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['contractor', 'admin'],
    required: true
  },
  // For contractors - which parking lot they manage
  parkingLotId: {
    type: String,
    required: function () {
      return this.role === 'contractor';
    }
  },
  parkingLotName: {
    type: String,
    required: function () {
      return this.role === 'contractor';
    }
  },
  // Max capacity for contractor's parking lot
  maxCapacity: {
    type: Number,
    required: function () {
      return this.role === 'contractor';
    }
  },
  // Status for contractor accounts
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  // Warning counter
  warnings: {
    type: Number,
    default: 0
  },
  // Suspension end date
  suspendedUntil: {
    type: Date,
    default: null
  },
  // Admin action notes
  notes: [{
    type: {
      type: String,
      required: true
    },
    reason: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);