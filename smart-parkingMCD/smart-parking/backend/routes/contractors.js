// backend/routes/contractors.js
// Routes for contractor management (admin only)

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ParkingLog = require('../models/ParkingLog');
const Notification = require('../models/Notification');
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

// Middleware to check admin role
const adminOnly = (req, res, next) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// GET /api/contractors - List all contractors
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const contractors = await User.find({ role: 'contractor' })
            .select('-password')
            .sort({ createdAt: -1 });

        // Get current occupancy for each contractor
        const contractorsWithStats = await Promise.all(contractors.map(async (contractor) => {
            const logs = await ParkingLog.find({ parkingLotId: contractor.parkingLotId })
                .sort({ timestamp: -1 });

            // Calculate current occupancy
            let currentOccupancy = 0;
            for (const log of logs) {
                if (log.action === 'entry') currentOccupancy++;
                else if (log.action === 'exit') currentOccupancy--;
            }

            // Count violations in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const violationCount = await ParkingLog.countDocuments({
                parkingLotId: contractor.parkingLotId,
                isViolation: true,
                timestamp: { $gte: thirtyDaysAgo }
            });

            // Count recent activity (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentActivity = await ParkingLog.countDocuments({
                parkingLotId: contractor.parkingLotId,
                timestamp: { $gte: sevenDaysAgo }
            });

            return {
                ...contractor.toObject(),
                currentOccupancy: Math.max(0, currentOccupancy),
                violationCount,
                recentActivity
            };
        }));

        res.json({ success: true, contractors: contractorsWithStats });
    } catch (error) {
        console.error('Error fetching contractors:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/contractors/:id - Get contractor details
router.get('/:id', auth, adminOnly, async (req, res) => {
    try {
        const contractor = await User.findOne({
            _id: req.params.id,
            role: 'contractor'
        }).select('-password');

        if (!contractor) {
            return res.status(404).json({ success: false, message: 'Contractor not found' });
        }

        // Get parking logs
        const logs = await ParkingLog.find({ parkingLotId: contractor.parkingLotId })
            .sort({ timestamp: -1 })
            .limit(100);

        // Calculate statistics
        let currentOccupancy = 0;
        for (const log of logs) {
            if (log.action === 'entry') currentOccupancy++;
            else if (log.action === 'exit') currentOccupancy--;
        }

        // Violations
        const violations = logs.filter(log => log.isViolation);

        // Activity by day (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentLogs = await ParkingLog.find({
            parkingLotId: contractor.parkingLotId,
            timestamp: { $gte: sevenDaysAgo }
        });

        // Group by date
        const activityByDate = {};
        recentLogs.forEach(log => {
            const date = log.timestamp.toISOString().split('T')[0];
            if (!activityByDate[date]) {
                activityByDate[date] = { entries: 0, exits: 0 };
            }
            if (log.action === 'entry') activityByDate[date].entries++;
            else if (log.action === 'exit') activityByDate[date].exits++;
        });

        res.json({
            success: true,
            contractor: contractor.toObject(),
            stats: {
                currentOccupancy: Math.max(0, currentOccupancy),
                totalViolations: violations.length,
                recentActivity: recentLogs.length,
                utilizationRate: Math.round((currentOccupancy / contractor.maxCapacity) * 100)
            },
            logs: logs.slice(0, 50),
            violations: violations.slice(0, 20),
            activityByDate
        });
    } catch (error) {
        console.error('Error fetching contractor details:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/contractors/:id - Update contractor
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { parkingLotName, maxCapacity, status } = req.body;

        const contractor = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'contractor' },
            { parkingLotName, maxCapacity, status },
            { new: true, runValidators: true }
        ).select('-password');

        if (!contractor) {
            return res.status(404).json({ success: false, message: 'Contractor not found' });
        }

        res.json({ success: true, contractor });
    } catch (error) {
        console.error('Error updating contractor:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/contractors/:id/action - Take admin action
router.post('/:id/action', auth, adminOnly, async (req, res) => {
    try {
        const { actionType, reason, duration } = req.body;

        const contractor = await User.findOne({
            _id: req.params.id,
            role: 'contractor'
        });

        if (!contractor) {
            return res.status(404).json({ success: false, message: 'Contractor not found' });
        }

        const adminUser = await User.findById(req.userId);
        let notificationTitle = '';
        let notificationMessage = '';
        let notificationType = 'info';

        const action = {
            type: actionType,
            reason,
            timestamp: new Date(),
            performedBy: adminUser.email
        };

        switch (actionType) {
            case 'warning':
                contractor.warnings += 1;
                action.message = `Warning issued. Total warnings: ${contractor.warnings}`;
                notificationTitle = '⚠️ Warning Issued';
                notificationMessage = `You have received a warning. Reason: ${reason}. Total warnings: ${contractor.warnings}`;
                notificationType = 'warning';
                break;

            case 'suspend':
                contractor.status = 'suspended';
                if (duration) {
                    const suspendDate = new Date();
                    suspendDate.setDate(suspendDate.getDate() + parseInt(duration));
                    contractor.suspendedUntil = suspendDate;
                    action.message = `Suspended for ${duration} days`;
                    notificationMessage = `Your account has been suspended for ${duration} days. Reason: ${reason}`;
                } else {
                    action.message = 'Suspended indefinitely';
                    notificationMessage = `Your account has been suspended indefinitely. Reason: ${reason}`;
                }
                notificationTitle = '🚫 Account Suspended';
                notificationType = 'error';
                break;

            case 'activate':
                contractor.status = 'active';
                contractor.suspendedUntil = null;
                action.message = 'Account activated';
                notificationTitle = '✅ Account Activated';
                notificationMessage = `Your account has been activated. ${reason}`;
                notificationType = 'success';
                break;

            case 'reset':
                contractor.warnings = 0;
                action.message = 'Warnings reset to 0';
                notificationTitle = '🔄 Warnings Reset';
                notificationMessage = `Your warnings have been reset. ${reason}`;
                notificationType = 'info';
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid action type' });
        }

        contractor.notes.push(action);
        await contractor.save();

        // Create notification for contractor
        await Notification.create({
            userId: contractor._id,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            metadata: {
                actionType,
                reason,
                performedBy: adminUser.email,
                duration
            }
        });

        res.json({
            success: true,
            message: action.message,
            contractor: contractor.toObject()
        });
    } catch (error) {
        console.error('Error taking action:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
