// backend/models/ParkingLog.js
// Schema for tracking all parking entry/exit events
// WITH TAMPER-PROOF FEATURES

const mongoose = require('mongoose');

const parkingLogSchema = new mongoose.Schema({
  parkingLotId: {
    type: String,
    required: true,
    index: true
  },
  parkingLotName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['entry', 'exit'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    immutable: true  // Cannot be changed after creation
  },
  currentOccupancy: {
    type: Number,
    required: true,
    min: 0
  },
  maxCapacity: {
    type: Number,
    required: true
  },
  // Flag for violation (occupancy > capacity)
  isViolation: {
    type: Boolean,
    default: false
  },
  // How much over capacity (0 if not violated)
  violationAmount: {
    type: Number,
    default: 0
  },
  // User who performed this action
  performedBy: {
    type: String,
    required: true
  },
  
  // ===== TAMPER-PROOF FIELDS =====
  
  // SHA-256 hash of this entry's data
  hash: {
    type: String,
    required: true,
    immutable: true
  },
  
  // Hash of the previous entry (blockchain-style chain)
  previousHash: {
    type: String,
    required: true,
    default: '0',  // Genesis block
    immutable: true
  },
  
  // Digital signature (optional, for enhanced security)
  signature: {
    type: String,
    immutable: true
  },
  
  // Trusted timestamp from external source (optional)
  trustedTimestamp: {
    unixtime: Number,
    utc_datetime: String,
    source: String
  },
  
  // Integrity status
  verified: {
    type: Boolean,
    default: true
  },
  
  // Metadata for audit trail
  metadata: {
    ipAddress: String,
    userAgent: String,
    geolocation: {
      latitude: Number,
      longitude: Number
    }
  }
});

// Index for faster queries
parkingLogSchema.index({ parkingLotId: 1, timestamp: -1 });
parkingLogSchema.index({ isViolation: 1, timestamp: -1 });
parkingLogSchema.index({ hash: 1 }, { unique: true });

// Prevent modifications to immutable fields
parkingLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    // Prevent updates to tamper-proof fields
    const immutableFields = ['timestamp', 'hash', 'previousHash', 'signature'];
    immutableFields.forEach(field => {
      if (this.isModified(field)) {
        const error = new Error(`Cannot modify immutable field: ${field}`);
        return next(error);
      }
    });
  }
  next();
});

module.exports = mongoose.model('ParkingLog', parkingLogSchema);