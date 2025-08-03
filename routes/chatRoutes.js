const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const messageController = require('../controllers/messageController');
const authenticateUser = require('../middlewares/authmiddleware');

router.use((req, res, next) => {
  console.log('=== CHAT ROUTES DEBUG ===');
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  console.log('========================');
  next();
});

router.get('/chats', authenticateUser, chatController.getUserChats);
router.post('/chats', authenticateUser, chatController.createChat);
router.get('/chats/:chatId', authenticateUser, chatController.getChat);
router.delete('/chats/:chatId', authenticateUser, chatController.deleteChat);
router.get('/users/search', authenticateUser, chatController.searchUsers);

router.post('/messages', (req, res, next) => {
  console.log('🚀 POST /messages route hit!');
  console.log('Body before auth:', req.body);
  next();
}, authenticateUser, (req, res, next) => {
  console.log('🔐 After authentication, user:', req.user ? req.user.name : 'NO USER');
  next();
}, messageController.sendMessage);

router.get('/chats/:chatId/messages', authenticateUser, messageController.getChatMessages);
router.put('/chats/:chatId/read', authenticateUser, messageController.markAsRead);
router.delete('/messages/:messageId', authenticateUser, messageController.deleteMessage);
router.get('/messages/unread-count', authenticateUser, messageController.getUnreadCount);

module.exports = router;