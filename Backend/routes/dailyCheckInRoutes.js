const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');

const {
    createDailyCheckIn,
} = require('../controllers/dailyCheckInController.js');

router.post('/', authmiddleware, createDailyCheckIn);

module.exports = router;