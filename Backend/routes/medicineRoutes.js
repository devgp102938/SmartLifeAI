const express = require('express');
const router = express.Router();

const authmiddleware = require('../middleware/authMiddleware');

const {
    createMedicine,
    getMedicine,
    getMedicineById,
    updateMedicine,
    takeDose,
    skipDose,
} = require("../controllers/medicineController.js");

router.post('/', authmiddleware, createMedicine);
router.get('/', authmiddleware, getMedicine);
router.get('/:id', authmiddleware, getMedicineById);
router.put('/:id', authmiddleware, updateMedicine);
router.patch('/:id/taken', authmiddleware, takeDose);
router.patch('/:id/skipped', authmiddleware, skipDose);

module.exports = router
