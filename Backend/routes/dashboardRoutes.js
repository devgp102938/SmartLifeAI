const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware.js');
const { getDashboard } = require('../controllers/dashboardController.js');

router.get('/', authmiddleware, getDashboard);

module.exports = router;
