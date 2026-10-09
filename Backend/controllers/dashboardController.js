const dashboardService = require('../services/dashboardService.js');

// GET /api/dashboard
// Query params: period ('last7days', 'thisWeek', 'last30days', etc.), timezone, customStart, customEnd
const getDashboard = async (req, res) => {
    try {
        const { period = 'last7days', timezone, customStart, customEnd } = req.query;
        const tz = timezone || 'UTC';

        const dashboardData = await dashboardService.getDashboard({
            userId: req.user._id,
            period,
            timezone: tz,
            customStart,
            customEnd,
            now: new Date()
        });

        res.status(200).json({
            success: true,
            dashboard: dashboardData
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    getDashboard
};
