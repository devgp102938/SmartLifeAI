const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');

const {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
} = require('../controllers/taskController.js');

router.use(authmiddleware);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/complete', completeTask);
router.patch('/:id/uncomplete', uncompleteTask);

module.exports = router;