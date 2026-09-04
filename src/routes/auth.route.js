const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', authMiddleware.validateRegistration, authController.registerUser);
router.post('/login', authMiddleware.validateLogin, authController.loginUser);
router.post('/verify-email', authController.verifyEmail); // verify code endpoint
router.post('/resend-code', authController.resendCode);   // resend code endpoint

module.exports = router;
