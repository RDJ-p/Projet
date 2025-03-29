const express = require('express');
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


router.get('/dashboard', 
  authMiddleware.isAuthenticated, 
  (req, res) => {
    res.send('Welcome to the dashboard!');
  }
);

module.exports = router;