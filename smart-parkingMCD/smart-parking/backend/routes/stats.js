// backend/routes/stats.js
// Statistics and revenue tracking routes

const express = require('express');
const router = express.Router();
const ParkingLog = require('../models/ParkingLog');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_123');
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// GET /api/stats/revenue - Get revenue statistics
router.get('/revenue', auth, async (req, res) => {
    try {
        const { period = 'today' } = req.query;

        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else if (period === 'all') {
            startDate = new Date(0); // Beginning of time
        }

        // Calculate total revenue
        const revenueData = await ParkingLog.aggregate([
            {
                $match: {
                    action: 'exit',
                    exitTime: { $gte: startDate },
                    fee: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$fee' },
                    totalTransactions: { $sum: 1 },
                    avgFee: { $avg: '$fee' }
                }
            }
        ]);

        // Revenue by vehicle type
        const revenueByType = await ParkingLog.aggregate([
            {
                $match: {
                    action: 'exit',
                    exitTime: { $gte: startDate },
                    fee: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: '$vehicleType',
                    revenue: { $sum: '$fee' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = revenueData[0] || { totalRevenue: 0, totalTransactions: 0, avgFee: 0 };

        res.json({
            success: true,
            data: {
                period,
                totalRevenue: Math.round(result.totalRevenue || 0),
                totalTransactions: result.totalTransactions || 0,
                avgFee: Math.round(result.avgFee || 0),
                byVehicleType: revenueByType
            }
        });
    } catch (error) {
        console.error('Error fetching revenue:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/stats/violations - Get active violations count
router.get('/violations', auth, async (req, res) => {
    try {
        // Get current violations (lots currently over capacity)
        const allLots = await User.find({ role: 'contractor' }).select('parkingLotId parkingLotName maxCapacity');

        const violations = [];

        for (const lot of allLots) {
            const logs = await ParkingLog.find({ parkingLotId: lot.parkingLotId })
                .sort({ timestamp: -1 })
                .limit(100);

            let currentOccupancy = 0;
            for (const log of logs) {
                if (log.action === 'entry') currentOccupancy++;
                else if (log.action === 'exit') currentOccupancy--;
            }

            if (currentOccupancy > lot.maxCapacity) {
                violations.push({
                    parkingLotId: lot.parkingLotId,
                    parkingLotName: lot.parkingLotName,
                    currentOccupancy,
                    maxCapacity: lot.maxCapacity,
                    violationAmount: currentOccupancy - lot.maxCapacity
                });
            }
        }

        res.json({
            success: true,
            data: {
                activeViolations: violations.length,
                violations
            }
        });
    } catch (error) {
        console.error('Error fetching violations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/stats/vehicle-count - Get total vehicles currently parked
router.get('/vehicle-count', auth, async (req, res) => {
    try {
        const allLots = await User.find({ role: 'contractor' }).select('parkingLotId');

        let totalVehicles = 0;
        const vehiclesByType = {
            '2-wheeler': 0,
            '4-wheeler': 0,
            'heavy': 0
        };

        for (const lot of allLots) {
            const logs = await ParkingLog.find({ parkingLotId: lot.parkingLotId })
                .sort({ timestamp: -1 })
                .limit(200);

            let occupancy = 0;
            for (const log of logs) {
                if (log.action === 'entry') {
                    occupancy++;
                    if (log.vehicleType) {
                        vehiclesByType[log.vehicleType]++;
                    }
                } else if (log.action === 'exit') {
                    occupancy--;
                }
            }

            totalVehicles += Math.max(0, occupancy);
        }

        res.json({
            success: true,
            data: {
                totalVehicles,
                byType: vehiclesByType
            }
        });
    } catch (error) {
        console.error('Error fetching vehicle count:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/stats/pending-apps - Get pending contractor applications
router.get('/pending-apps', auth, async (req, res) => {
    try {
        // Count contractors with inactive status (pending approval)
        const pendingCount = await User.countDocuments({
            role: 'contractor',
            status: 'inactive'
        });

        const pendingContractors = await User.find({
            role: 'contractor',
            status: 'inactive'
        }).select('email parkingLotName createdAt').limit(10);

        res.json({
            success: true,
            data: {
                pendingCount,
                pendingApplications: pendingContractors
            }
        });
    } catch (error) {
        console.error('Error fetching pending apps:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/stats/dashboard - Get all dashboard stats at once
router.get('/dashboard', auth, async (req, res) => {
    try {
        // 1. Calculate Total Revenue (Today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const revenueResult = await ParkingLog.aggregate([
            {
                $match: {
                    action: 'exit',
                    exitTime: { $gte: todayStart },
                    fee: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$fee' }
                }
            }
        ]);
        const totalRevenue = revenueResult[0]?.totalRevenue || 0;

        // 2. Calculate Active Violations & Total Vehicle Count
        // We need to check current occupancy for ALL lots to get accurate numbers
        const allLots = await User.find({ role: 'contractor' }).select('parkingLotId maxCapacity');

        let totalActiveViolations = 0;
        let totalVehicles = 0;

        // Note: For a production app, occupancy should be maintained in the User/Lot model
        // directly to avoid this expensive calculation on every dashboard load.
        // For this hackathon/demo, calculating on the fly is acceptable.
        for (const lot of allLots) {
            // Get all logs for this lot to calculate 'current' state
            // Optimization: In a real app, we'd only query logs since the last 'reset' or trust a 'currentOccupancy' field
            const logs = await ParkingLog.find({ parkingLotId: lot.parkingLotId });

            let occupancy = 0;
            for (const log of logs) {
                if (log.action === 'entry') occupancy++;
                else if (log.action === 'exit') occupancy--;
            }
            // Sanity check: occupancy can't be negative
            occupancy = Math.max(0, occupancy);

            totalVehicles += occupancy;

            if (occupancy > lot.maxCapacity) {
                totalActiveViolations++;
            }
        }

        // 3. Pending Applications
        const pendingApps = await User.countDocuments({ role: 'contractor', status: 'inactive' });

        res.json({
            success: true,
            data: {
                totalRevenue: Math.round(totalRevenue),
                activeViolations: totalActiveViolations,
                vehicleCount: totalVehicles,
                pendingApps: pendingApps
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
