const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');

const {
    createHabit,
    getHabits,
    getHabitbyId,
    updateHabit,
} = require('../controllers/habitController.js');

router.post('/', authmiddleware, createHabit);
router.get('/', authmiddleware, getHabits);
router.get('/:id', authmiddleware,getHabitbyId);
router.put('/:id', authmiddleware, updateHabit);

module.exports = router;