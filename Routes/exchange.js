const express = require('express');
const router = express.Router();
const exchangeController = require('../Controllers/exchangecontroller');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware.isAuthenticated, exchangeController.createExchange);
router.get('/', authMiddleware.isAuthenticated, exchangeController.getExchanges);
router.get('/:exchangeId/messages', authMiddleware.isAuthenticated, exchangeController.getMessages);
router.post('/:exchangeId/messages', authMiddleware.isAuthenticated, exchangeController.sendMessage);

module.exports = router;