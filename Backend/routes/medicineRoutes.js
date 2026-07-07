const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware');

const {
    createMedicine,
    getMedicine
} = require("../controllers/medicineController.js");

router.post('/', authmiddleware, createMedicine);
router.get('/', authmiddleware, getMedicine);

module.exports = router
