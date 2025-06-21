const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middlewares/authMiddleware');

router.get('/proposals/:proposalId/messages', auth.isAuthenticated, chatController.getMessagesByProposal);

router.post(
  '/proposals/:proposalId/messages',
  auth.isAuthenticated,
  chatController.uploadMiddleware,
  chatController.sendMessageByProposal
);

router.get('/conversations', auth.isAuthenticated, chatController.getUserConversations);

router.post('/messages/:messageId/report', auth.isAuthenticated, chatController.reportMessage);
router.delete('/messages/:messageId', auth.isAuthenticated, chatController.deleteMessage);

module.exports = router;
