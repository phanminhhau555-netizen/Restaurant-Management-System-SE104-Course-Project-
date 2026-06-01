const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
router.post('/lookup', verifyToken, customerController.lookupOrCreate);
router.post('/lookup-existing', verifyToken, customerController.lookupExisting);
router.get('/', verifyToken, customerController.getAllCustomers);
router.get('/search', verifyToken, customerController.searchCustomer);
router.post('/', verifyToken, customerController.createCustomer);
router.get('/:id/points-history', verifyToken, customerController.getPointsHistory);
router.get('/:id', verifyToken, customerController.getCustomerById);
router.put('/:id', verifyToken, customerController.updateCustomer);
router.delete('/:id', verifyToken, isAdmin, customerController.deleteCustomer);
router.post('/:id/add-points', verifyToken, customerController.addPoints);
router.post('/:id/redeem-points', verifyToken, customerController.redeemPoints);

module.exports = router;
