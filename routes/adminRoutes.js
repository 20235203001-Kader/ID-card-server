const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.protectAdmin);

router.get('/dashboard', adminController.getDashboardData);
router.post('/process-application', adminController.processApplication);

module.exports = router;