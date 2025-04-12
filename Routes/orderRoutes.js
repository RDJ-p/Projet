const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware.isAuthenticated, orderController.createOrder);
router.get('/', authMiddleware.isAuthenticated, orderController.getOrders);
router.get('/:id', authMiddleware.isAuthenticated, orderController.getOrderById);

module.exports = router;