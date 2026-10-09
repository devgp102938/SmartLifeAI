const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');
const { getAiAdvice } = require('../controllers/aiController.js');

router.post('/chat', authmiddleware, getAiAdvice);

module.exports = router;
