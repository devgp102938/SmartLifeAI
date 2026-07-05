const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');

const {
    createHabit,
    getHabits,
    getHabitbyId,
    updateHabit,
    deleteHabit,
    completeHabit,
    uncompleteHabit,
} = require('../controllers/habitController.js');

router.post('/', authmiddleware, createHabit);
router.get('/', authmiddleware, getHabits);
router.get('/:id', authmiddleware,getHabitbyId);
router.put('/:id', authmiddleware, updateHabit);
router.delete('/:id', authmiddleware, deleteHabit);
router.patch('/:id/complete', authmiddleware, completeHabit);
router.patch('/:id/uncomplete', authmiddleware, uncompleteHabit);

module.exports = router;