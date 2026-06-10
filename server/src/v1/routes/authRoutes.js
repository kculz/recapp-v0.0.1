const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/auth');

// Public authentication and activation endpoints
router.get('/verify-activation', authController.verifyActivation);
router.post('/activate', authController.activate);
router.post('/login', authController.login);
router.post('/verify-mfa', authController.verifyMfa);

// Secure invitation endpoint restricted to Admins/SuperAdmins only
router.post('/invite', protect, restrictTo('Admin', 'SuperAdmin'), authController.invite);

module.exports = router;
