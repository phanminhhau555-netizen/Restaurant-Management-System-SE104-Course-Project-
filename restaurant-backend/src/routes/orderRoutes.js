const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');
router.get('/', verifyToken, orderController.getAllOrders);
router.get('/active', verifyToken, orderController.getActiveOrders);
router.get('/kitchen', verifyToken, orderController.getKitchenOrders);
router.get('/:id', verifyToken, orderController.getOrderById);
router.post('/', verifyToken, orderController.createOrder);
router.post('/:id/items', verifyToken, orderController.addOrderItem);
router.post('/:id/send', verifyToken, orderController.sendToKitchen);
router.patch('/:id/items/:itemId/status', verifyToken, orderController.updateItemStatus);
router.delete('/:id/items/:itemId', verifyToken, orderController.deleteOrderItem);
router.delete('/:id', verifyToken, orderController.deleteOrder);

module.exports = router;