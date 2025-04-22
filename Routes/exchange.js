const express = require('express');
const router = express.Router();
const exchangeController = require('../Controllers/exchangecontroller');

router.post('/', exchangeController.createExchange);
router.get('/', exchangeController.getExchanges);



module.exports = router;
