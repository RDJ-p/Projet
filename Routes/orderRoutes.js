const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const { confirmPaypalPayment } = require('../Controllers/confirmPaypalPayment');

router.post('/', authMiddleware.isAuthenticated, orderController.createOrder);
router.get('/', authMiddleware.isAuthenticated, orderController.getOrders);
router.get('/:id', authMiddleware.isAuthenticated, orderController.getOrderById);
router.post('/paypal-confirmation', authMiddleware.isAuthenticated, confirmPaypalPayment);
router.put(
  '/:orderId/shipping',
  authMiddleware.isAuthenticated,
  adminMiddleware.isAdmin,
  orderController.updateShippingStatus
);
router.delete(
  '/unconfirmed',
  authMiddleware.isAuthenticated,
  adminMiddleware.isAdmin,
  orderController.deleteAllUnconfirmedOrders
);
router.delete(
  '/:orderId',
  authMiddleware.isAuthenticated,
  adminMiddleware.isAdmin,
  orderController.deleteUnconfirmedOrder
);

module.exports = router;
