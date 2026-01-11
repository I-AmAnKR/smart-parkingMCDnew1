// backend/routes/parking.js
// Parking operations: entry, exit, stats, AI insights, tamper-proof verification

const express = require('express');
const ParkingLog = require('../models/ParkingLog');
const User = require('../models/User');
const { authMiddleware, adminOnly, contractorOnly } = require('../middleware/authMiddleware');
const { generateComplianceReport, detectPatterns, answerQuery, analyzeParkingLot } = require('../ai/insights');
const { generateLogHash, verifyLogChain, detectTimestampAnomalies } = require('../utils/crypto-utils');

const router = express.Router();

/**
 * POST /api/parking/entry
 * Log vehicle entry (contractors only)
 * WITH TAMPER-PROOF HASH CHAIN
 */
router.post('/entry', authMiddleware, contractorOnly, async (req, res) => {
  try {
    const { parkingLotId, parkingLotName, maxCapacity } = req.user;
    const { vehicleType, vehicleNumber } = req.body;

    if (!vehicleType || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle type and number are required'
      });
    }

    // Get current occupancy and previous log for hash chain
    const lastLog = await ParkingLog.findOne({ parkingLotId }).sort({ _id: -1 });
    const currentOccupancy = lastLog ? lastLog.currentOccupancy : 0;
    const newOccupancy = currentOccupancy + 1;
    const previousHash = lastLog ? lastLog.hash : '0';

    // Check if violation
    const isViolation = newOccupancy > maxCapacity;
    const violationAmount = isViolation ? newOccupancy - maxCapacity : 0;

    // Prepare log data
    const logData = {
      parkingLotId,
      parkingLotName,
      action: 'entry',
      timestamp: new Date(),
      currentOccupancy: newOccupancy,
      maxCapacity,
      isViolation,
      violationAmount,
      performedBy: req.user.email,
      previousHash,
      vehicleType,
      vehicleNumber: vehicleNumber.toUpperCase(),
      entryTime: new Date()
    };

    // Generate cryptographic hash
    const hash = generateLogHash(logData, previousHash);
    logData.hash = hash;

    // Create log entry
    const log = new ParkingLog(logData);
    await log.save();

    res.json({
      success: true,
      message: 'Vehicle entry logged',
      data: {
        currentOccupancy: newOccupancy,
        maxCapacity,
        isViolation,
        violationAmount,
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase(),
        hash: hash.substring(0, 16) + '...'  // Show partial hash for demo
      }
    });
  } catch (error) {
    console.error('Entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log entry.'
    });
  }
});

/**
 * POST /api/parking/exit
 * Log vehicle exit (contractors only)
 * WITH TAMPER-PROOF HASH CHAIN
 */
router.post('/exit', authMiddleware, contractorOnly, async (req, res) => {
  try {
    const { parkingLotId, parkingLotName, maxCapacity } = req.user;
    const { vehicleNumber } = req.body;

    // Get current occupancy and previous log for hash chain
    const lastLog = await ParkingLog.findOne({ parkingLotId }).sort({ _id: -1 });
    const currentOccupancy = lastLog ? lastLog.currentOccupancy : 0;

    if (currentOccupancy === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot log exit. Parking lot is empty.'
      });
    }

    // Find the entry log for this vehicle
    let entryLog = null;
    let fee = 0;
    let duration = 0;

    if (vehicleNumber) {
      entryLog = await ParkingLog.findOne({
        parkingLotId,
        action: 'entry',
        vehicleNumber: vehicleNumber.toUpperCase(),
        exitTime: { $exists: false }
      }).sort({ entryTime: -1 });

      if (entryLog) {
        // Calculate duration and fee
        const exitTime = new Date();
        duration = Math.ceil((exitTime - entryLog.entryTime) / (1000 * 60)); // minutes

        // Pricing: ₹10/hr for 2-wheeler, ₹20/hr for 4-wheeler, ₹50/hr for heavy
        const PRICING = {
          '2-wheeler': 10,
          '4-wheeler': 20,
          'heavy': 50
        };

        const ratePerHour = PRICING[entryLog.vehicleType] || 20;
        fee = Math.ceil((duration / 60) * ratePerHour);

        // Update entry log with exit info
        entryLog.exitTime = exitTime;
        entryLog.duration = duration;
        entryLog.fee = fee;
        await entryLog.save();
      }
    }

    const newOccupancy = currentOccupancy - 1;
    const previousHash = lastLog ? lastLog.hash : '0';

    // Prepare log data
    const logData = {
      parkingLotId,
      parkingLotName,
      action: 'exit',
      timestamp: new Date(),
      currentOccupancy: newOccupancy,
      maxCapacity,
      isViolation: false,
      violationAmount: 0,
      performedBy: req.user.email,
      previousHash,
      vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase() : undefined,
      vehicleType: entryLog?.vehicleType,
      exitTime: new Date(),
      duration,
      fee,
      entryLogId: entryLog?._id
    };

    // Generate cryptographic hash
    const hash = generateLogHash(logData, previousHash);
    logData.hash = hash;

    // Create log entry
    const log = new ParkingLog(logData);
    await log.save();

    res.json({
      success: true,
      message: 'Vehicle exit logged',
      data: {
        currentOccupancy: newOccupancy,
        maxCapacity,
        fee,
        duration,
        vehicleType: entryLog?.vehicleType,
        hash: hash.substring(0, 16) + '...'
      }
    });
  } catch (error) {
    console.error('Exit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log exit.'
    });
  }
});

/**
 * GET /api/parking/status
 * Get current status for contractor's parking lot
 */
router.get('/status', authMiddleware, contractorOnly, async (req, res) => {
  try {
    const { parkingLotId, maxCapacity } = req.user;

    const lastLog = await ParkingLog.findOne({ parkingLotId }).sort({ _id: -1 });
    const currentOccupancy = lastLog ? lastLog.currentOccupancy : 0;

    res.json({
      success: true,
      data: {
        currentOccupancy,
        maxCapacity,
        isOverCapacity: currentOccupancy > maxCapacity,
        utilizationPercent: Math.round((currentOccupancy / maxCapacity) * 100)
      }
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status.'
    });
  }
});

/**
 * GET /api/parking/logs
 * Get recent logs for contractor
 */
router.get('/logs', authMiddleware, contractorOnly, async (req, res) => {
  try {
    const { parkingLotId } = req.user;
    const logs = await ParkingLog.find({ parkingLotId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get logs.'
    });
  }
});

/**
 * GET /api/parking/admin/dashboard
 * Get dashboard data for admin
 */
router.get('/admin/dashboard', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Get all parking lots
    const contractors = await User.find({ role: 'contractor' });

    // Get current status for each lot
    const parkingLots = await Promise.all(contractors.map(async (contractor) => {
      const lastLog = await ParkingLog.findOne({ parkingLotId: contractor.parkingLotId })
        .sort({ _id: -1 });

      const currentOccupancy = lastLog ? lastLog.currentOccupancy : 0;
      const isViolating = currentOccupancy > contractor.maxCapacity;

      return {
        parkingLotId: contractor.parkingLotId,
        parkingLotName: contractor.parkingLotName,
        currentOccupancy,
        maxCapacity: contractor.maxCapacity,
        isViolating,
        utilizationPercent: Math.round((currentOccupancy / contractor.maxCapacity) * 100)
      };
    }));

    // Get recent violations (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentViolations = await ParkingLog.find({
      isViolation: true,
      timestamp: { $gte: oneDayAgo }
    }).sort({ _id: -1 }).limit(50);

    res.json({
      success: true,
      data: {
        parkingLots,
        totalLots: parkingLots.length,
        violatingLots: parkingLots.filter(lot => lot.isViolating).length,
        recentViolations
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data.'
    });
  }
});

/**
    const violations = await ParkingLog.find({
      isViolation: true,
      timestamp: { $gte: startDate }
    }).sort({ _id: -1 });

    // Group by parking lot
    const violationsByLot = {};
    violations.forEach(v => {
      if (!violationsByLot[v.parkingLotId]) {
        violationsByLot[v.parkingLotId] = {
          parkingLotName: v.parkingLotName,
          count: 0,
          maxViolationAmount: 0
        };
      }
      violationsByLot[v.parkingLotId].count++;
      violationsByLot[v.parkingLotId].maxViolationAmount = Math.max(
        violationsByLot[v.parkingLotId].maxViolationAmount,
        v.violationAmount
      );
    });

    res.json({
      success: true,
      data: {
        violations,
        summary: violationsByLot,
        totalViolations: violations.length
      }
    });
  } catch (error) {
    console.error('Violations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get violations.'
    });
  }
});

/**
 * GET /api/parking/admin/charts
 * Get data for charts
 */
router.get('/admin/charts', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get violations over time (grouped by day)
    const violations = await ParkingLog.aggregate([
      {
        $match: {
          isViolation: true,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get occupancy vs capacity for each lot
    const contractors = await User.find({ role: 'contractor' });
    const occupancyData = await Promise.all(contractors.map(async (c) => {
      const lastLog = await ParkingLog.findOne({ parkingLotId: c.parkingLotId })
        .sort({ _id: -1 });
      return {
        parkingLotName: c.parkingLotName,
        currentOccupancy: lastLog ? lastLog.currentOccupancy : 0,
        maxCapacity: c.maxCapacity
      };
    }));

    res.json({
      success: true,
      data: {
        violationsOverTime: violations,
        occupancyData
      }
    });
  } catch (error) {
    console.error('Charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chart data.'
    });
  }
});

/**
 * POST /api/parking/admin/ai-report
 * Generate AI compliance report
 */
router.post('/admin/ai-report', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Get recent violations
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const violations = await ParkingLog.find({
      isViolation: true,
      timestamp: { $gte: oneDayAgo }
    }).limit(50);

    // Get all parking lots
    const contractors = await User.find({ role: 'contractor' });
    const parkingLots = contractors.map(c => ({
      parkingLotId: c.parkingLotId,
      parkingLotName: c.parkingLotName,
      maxCapacity: c.maxCapacity
    }));

    // Generate report using AI
    const report = await generateComplianceReport(violations, parkingLots);

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    console.error('AI Report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate AI report.'
    });
  }
});

/**
 * POST /api/parking/admin/ai-query
 * Answer admin queries using AI
 */
router.post('/admin/ai-query', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required.'
      });
    }

    // Get recent context
    const recentLogs = await ParkingLog.find()
      .sort({ _id: -1 })
      .limit(30);

    const answer = await answerQuery(query, recentLogs);

    res.json({
      success: true,
      data: { answer }
    });
  } catch (error) {
    console.error('AI Query error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process query.'
    });
  }
});

/**
 * GET /api/parking/admin/verify-integrity
 * Verify cryptographic integrity of log chain
 * ⭐ TAMPER-PROOF FEATURE
 */
router.get('/admin/verify-integrity', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { parkingLotId } = req.query;

    // Get logs to verify
    const query = parkingLotId ? { parkingLotId } : {};
    const logs = await ParkingLog.find(query).sort({ timestamp: 1 });

    // Verify hash chain
    const chainResult = verifyLogChain(logs);

    // Detect timestamp anomalies
    const timestampAnomalies = detectTimestampAnomalies(logs);

    // Check for gaps in chain
    const gaps = [];
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].previousHash !== logs[i - 1].hash) {
        gaps.push({
          index: i,
          expected: logs[i - 1].hash,
          found: logs[i].previousHash
        });
      }
    }

    res.json({
      success: true,
      data: {
        chainIntegrity: chainResult,
        timestampAnomalies,
        gaps,
        totalEntries: logs.length,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Integrity verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify integrity.'
    });
  }
});

/**
 * GET /api/parking/admin/audit-trail
 * Get complete audit trail for a parking lot
 * ⭐ TAMPER-PROOF FEATURE
 */
router.get('/admin/audit-trail', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { parkingLotId, startDate, endDate } = req.query;

    if (!parkingLotId) {
      return res.status(400).json({
        success: false,
        message: 'Parking lot ID is required.'
      });
    }

    const query = { parkingLotId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await ParkingLog.find(query).sort({ _id: 1 });

    // Add verification status to each entry
    const auditTrail = logs.map((log, index) => ({
      _id: log._id,
      timestamp: log.timestamp,
      action: log.action,
      occupancy: log.currentOccupancy,
      capacity: log.maxCapacity,
      performedBy: log.performedBy,
      hash: log.hash,
      previousHash: log.previousHash,
      verified: index === 0 || log.previousHash === logs[index - 1].hash,
      isViolation: log.isViolation
    }));

    res.json({
      success: true,
      data: {
        auditTrail,
        totalEntries: auditTrail.length,
        parkingLotId
      }
    });
  } catch (error) {
    console.error('Audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit trail.'
    });
  }
});

/**
 * GET /api/parking/verify-integrity
 * Verify cryptographic integrity of all parking logs
 * Admin only - sends notifications if tampering detected
 */
router.get('/verify-integrity', authMiddleware, adminOnly, async (req, res) => {
  try {
    const Notification = require('../models/Notification');

    // Get all parking logs grouped by parking lot
    const allLogs = await ParkingLog.find().sort({ parkingLotId: 1, timestamp: 1 });

    if (allLogs.length === 0) {
      return res.json({
        success: true,
        isValid: true,
        totalLogs: 0,
        verifiedLogs: 0,
        errors: []
      });
    }

    // Group logs by parking lot
    const logsByLot = {};
    allLogs.forEach(log => {
      if (!logsByLot[log.parkingLotId]) {
        logsByLot[log.parkingLotId] = {
          parkingLotName: log.parkingLotName,
          logs: []
        };
      }
      logsByLot[log.parkingLotId].logs.push(log);
    });

    let totalLogs = 0;
    let verifiedLogs = 0;
    const errors = [];

    // Verify each parking lot's chain
    for (const [parkingLotId, lotData] of Object.entries(logsByLot)) {
      const { parkingLotName, logs } = lotData;
      totalLogs += logs.length;

      // Verify hash chain
      const chainResult = verifyLogChain(logs);

      if (chainResult.valid) {
        verifiedLogs += logs.length;
      } else {
        // Record error with parking lot details
        // verifyLogChain returns a single error object, not an array of errors
        errors.push({
          parkingLotId,
          parkingLotName,
          logId: chainResult.logId || 'N/A',
          timestamp: logs[chainResult.brokenAt] ? logs[chainResult.brokenAt].timestamp : new Date(),
          issue: chainResult.message
        });
      }
    }

    const isValid = errors.length === 0;

    // If integrity violations found, create notification for admin
    if (!isValid) {
      const affectedLots = [...new Set(errors.map(e => e.parkingLotName))];
      const lotsList = affectedLots.join(', ');

      // Get all admin users
      const admins = await User.find({ role: 'admin' });

      // Create notification for each admin
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          type: 'critical',
          title: '🚨 Data Integrity Violation Detected',
          message: `Tampering detected in parking logs. Affected lots: ${lotsList}. ${errors.length} issue(s) found. Immediate investigation required.`,
          metadata: {
            affectedLots,
            issueCount: errors.length,
            verificationTime: new Date()
          }
        });
      }
    }

    res.json({
      success: true,
      isValid,
      totalLogs,
      verifiedLogs,
      errors: errors.map(e => ({
        parkingLotId: e.parkingLotId,
        parkingLotName: e.parkingLotName,
        issue: e.issue,
        timestamp: e.timestamp
      }))
    });

  } catch (error) {
    console.error('Integrity verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify data integrity',
      error: error.message
    });
  }
});

module.exports = router;