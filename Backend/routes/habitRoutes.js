const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');

const {
    createHabit,
    getHabits,
    getHabitbyId,
} = require('../controllers/habitController.js');

router.post('/', authmiddleware, createHabit);
router.get('/', authmiddleware, getHabits);
router.get('/:id', authmiddleware,getHabitbyId);

module.exports = router;