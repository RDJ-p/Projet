const express = require('express');
const router = express.Router();
const exchangeController = require('../Controllers/exchangeController');

router.post('/', exchangeController.createExchange);

module.exports = router;
