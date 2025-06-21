const express = require('express');
const productController = require('../Controllers/productController');

const router = express.Router();
router.get('/recommendation', productController.recommendBook);
router.get('/similar', productController.getSimilarBooks);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);




module.exports = router;
