const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');

const {
    createDailyCheckIn,
    getDailyCheckIn,
    getDailyCheckInByDate,
    updateDailyCheckIn,
    deleteDailyCheckIn,
} = require('../controllers/dailyCheckInController.js');

router.post('/', authmiddleware, createDailyCheckIn);
router.get('/', authmiddleware, getDailyCheckIn);
router.get('/date/:date', authmiddleware, getDailyCheckInByDate);
router.put('/date/:date', authmiddleware, updateDailyCheckIn);
router.delete('/date/:date', authmiddleware, deleteDailyCheckIn);

module.exports = router;