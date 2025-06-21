const express = require('express');
const router = express.Router();
const blogPostController = require('../controllers/blogPostController');
const auth = require('../middlewares/authMiddleware');

router.get('/me', auth.isAuthenticated, (req, res) => {
  res.json({ id: req.user.id });
});

router.post('/', auth.isAuthenticated, blogPostController.createPost);
router.post('/:postId/comments', auth.isAuthenticated, blogPostController.addComment);
router.get('/:postId/comments', blogPostController.getComments);

router.get('/mine', auth.isAuthenticated, blogPostController.getUserPosts);

router.get('/', blogPostController.getAllPosts);
router.get('/:postId', blogPostController.getPostById);
router.delete('/:postId', auth.isAuthenticated, blogPostController.deletePost);
router.delete('/:postId/comments/:commentId', auth.isAuthenticated, blogPostController.deleteComment);

module.exports = router;
