/**
 * BI ERP - Auth routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', auth, authController.me);
router.put('/change-password', auth, authController.changePassword);

module.exports = router;
