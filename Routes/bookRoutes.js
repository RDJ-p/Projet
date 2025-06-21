const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const bookController = require('../controllers/bookController'); 
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/mine', authMiddleware.isAuthenticated, bookController.getMyBooks);
router.get('/available', authMiddleware.isAuthenticated, bookController.getAvailableBooks);
router.post('/', authMiddleware.isAuthenticated, bookController.addBook);
router.delete('/:id', authMiddleware.isAuthenticated, bookController.deleteBook);

router.post('/proposal', authMiddleware.isAuthenticated, bookController.proposeExchange);
router.get('/proposals/received', authMiddleware.isAuthenticated, bookController.getReceivedProposals);
router.get('/proposals/sent', authMiddleware.isAuthenticated, bookController.getSentProposals);
router.post('/proposals/:id/accept', authMiddleware.isAuthenticated, bookController.acceptProposal);
router.post('/proposals/:id/reject', authMiddleware.isAuthenticated, bookController.rejectProposal);
router.post('/proposals/:id/complete', authMiddleware.isAuthenticated, bookController.completeExchange);
router.post('/proposals/:id/revert', authMiddleware.isAuthenticated, bookController.revertExchange);
router.post('/proposals/:id/fail', authMiddleware.isAuthenticated, bookController.failExchange);
router.delete('/proposals/:id', authMiddleware.isAuthenticated, bookController.deleteProposal);

router.get('/blog', blogController.getAllBlogBooks);
router.get('/blog/:id', blogController.getBlogBookById);

module.exports = router;
