// backend/utils/crypto-utils.js
// Cryptographic utilities for tamper-proof logging

const crypto = require('crypto');

/**
 * Generate SHA-256 hash for a parking log entry
 * Includes previous hash to create blockchain-style chain
 */
function generateLogHash(logData, previousHash = '0') {
  const dataString = JSON.stringify({
    parkingLotId: logData.parkingLotId,
    action: logData.action,
    timestamp: logData.timestamp,
    currentOccupancy: logData.currentOccupancy,
    maxCapacity: logData.maxCapacity,
    performedBy: logData.performedBy,
    previousHash: previousHash
  });
  
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Verify integrity of an entire log chain
 * Returns details about chain validity
 */
function verifyLogChain(logs) {
  if (logs.length === 0) {
    return { valid: true, message: 'No logs to verify' };
  }

  // Verify first entry (genesis block)
  const firstLog = logs[0];
  const firstHash = generateLogHash(firstLog, '0');
  if (firstHash !== firstLog.hash) {
    return {
      valid: false,
      message: 'Genesis block hash mismatch',
      brokenAt: 0
    };
  }

  // Verify chain continuity
  for (let i = 1; i < logs.length; i++) {
    const currentLog = logs[i];
    const previousLog = logs[i - 1];
    
    // Check if previous hash matches
    if (currentLog.previousHash !== previousLog.hash) {
      return {
        valid: false,
        message: 'Chain broken: previous hash mismatch',
        brokenAt: i,
        expected: previousLog.hash,
        found: currentLog.previousHash
      };
    }
    
    // Verify current entry's hash
    const computedHash = generateLogHash(currentLog, currentLog.previousHash);
    if (computedHash !== currentLog.hash) {
      return {
        valid: false,
        message: 'Hash verification failed',
        brokenAt: i,
        logId: currentLog._id
      };
    }
  }

  return {
    valid: true,
    message: 'Chain integrity verified',
    entriesVerified: logs.length
  };
}

/**
 * Detect anomalies in timestamps
 * Helps identify backdating attempts
 */
function detectTimestampAnomalies(logs) {
  const anomalies = [];
  
  for (let i = 1; i < logs.length; i++) {
    const current = new Date(logs[i].timestamp);
    const previous = new Date(logs[i - 1].timestamp);
    
    // Check for backdating
    if (current < previous) {
      anomalies.push({
        type: 'BACKDATE',
        index: i,
        message: 'Entry timestamp is before previous entry',
        severity: 'HIGH'
      });
    }
    
    // Check for suspiciously large time gaps (>24 hours)
    const hoursDiff = (current - previous) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      anomalies.push({
        type: 'TIME_GAP',
        index: i,
        message: `${hoursDiff.toFixed(1)} hour gap between entries`,
        severity: 'MEDIUM'
      });
    }
    
    // Check for future timestamps (>5 min ahead of now)
    const now = new Date();
    const minutesAhead = (current - now) / (1000 * 60);
    if (minutesAhead > 5) {
      anomalies.push({
        type: 'FUTURE_TIMESTAMP',
        index: i,
        message: 'Entry timestamp is in the future',
        severity: 'HIGH'
      });
    }
  }
  
  return anomalies;
}

module.exports = {
  generateLogHash,
  verifyLogChain,
  detectTimestampAnomalies
};