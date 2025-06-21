
const express = require('express');
const path = require('path'); 
const router = express.Router();
const authController = require('../Controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/login', 
  authMiddleware.isGuest, 
  authController.showLogin
);

router.post('/login', authController.login);
router.get('/register', authMiddleware.isGuest, authController.showRegister);
router.post('/register', authController.register);
router.get('/logout', authController.logout);
router.get('/verify/:token', authController.verifyEmail);
router.post('/resend-verification', authMiddleware.isAuthenticated, authController.resendVerification);
router.post('/change-password', authMiddleware.isAuthenticated, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/reset-password/:token', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

router.get('/dashboard', 
  authMiddleware.isAuthenticated, 
  (req, res) => {
    res.send('Welcome to the dashboard!');
  }
);

module.exports = router;