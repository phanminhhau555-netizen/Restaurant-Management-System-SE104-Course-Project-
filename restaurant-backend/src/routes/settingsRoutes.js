const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, settingsController.getConfig);
router.get('/server-ip', verifyToken, settingsController.getServerIP);
router.put('/', verifyToken, isAdmin, settingsController.updateConfig);

module.exports = router;
