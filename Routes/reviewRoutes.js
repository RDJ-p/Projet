const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const reviewController = require('../controllers/reviewController');

router.get('/:bookId', reviewController.getReviewsByBookId);
router.post('/', auth.isAuthenticated, reviewController.postReview);

module.exports = router;
