const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/areas', verifyToken, tableController.getAllAreas);
router.post('/areas', verifyToken, isAdmin, tableController.createArea);
// Đặt bàn
router.get('/reservations/all', verifyToken, tableController.getAllReservations);
router.post('/reservations', verifyToken, tableController.createReservation);
router.get('/', verifyToken, tableController.getAllTables);
router.post('/', verifyToken, isAdmin, tableController.createTable);
// Bàn
router.get('/:id', verifyToken, tableController.getTableById);
router.put('/:id', verifyToken, isAdmin, tableController.updateTable);
router.delete('/:id', verifyToken, isAdmin, tableController.deleteTable);
router.patch('/:id/status', verifyToken, tableController.updateStatus);

router.delete('/areas/:id', verifyToken, isAdmin, tableController.deleteArea);

module.exports = router;
