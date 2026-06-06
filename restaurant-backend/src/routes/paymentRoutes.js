const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/:id/invoice', verifyToken, paymentController.getInvoice);
router.post('/:id/checkout', verifyToken, paymentController.checkout);
router.patch('/:id/cancel', verifyToken, paymentController.cancelOrder);

module.exports = router;