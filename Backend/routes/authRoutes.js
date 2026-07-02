const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');

const {
    register,
    login,
    logout,
    getMe,
} = require('../controllers/authController.js');

router.post('/signup', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authmiddleware, getMe);

module.exports = router;