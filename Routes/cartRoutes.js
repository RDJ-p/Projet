const express = require('express');
const router = express.Router();
const { addToCart, getCart, removeFromCart, updateCartQuantity } = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware.isAuthenticated, getCart);

router.post('/', authMiddleware.isAuthenticated, addToCart);

router.delete('/:productId', authMiddleware.isAuthenticated, removeFromCart);

router.patch('/:productId', authMiddleware.isAuthenticated, updateCartQuantity);

module.exports = router;
