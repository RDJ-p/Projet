const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/', cartController.getCart);

router.post('/', cartController.addToCart);

router.delete('/:productId', cartController.removeFromCart);

router.delete('/', cartController.clearCart);

router.patch('/:productId', cartController.updateCartQuantity);

module.exports = router;
