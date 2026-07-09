const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware');

const {
    createMedicine,
    getMedicine,
    getMedicineById,
} = require("../controllers/medicineController.js");

router.post('/', authmiddleware, createMedicine);
router.get('/', authmiddleware, getMedicine);
router.get('/:id', authmiddleware, getMedicineById);

module.exports = router
