const messageService = require('../services/messageService');

const messageController = {
  sendMessage: async (req, res) => {
    try {
      console.log('=== MESSAGE CONTROLLER DEBUG ===');
      console.log('1. Raw request body:', req.body);
      console.log('2. Request headers:', req.headers);
      console.log('3. Request user:', req.user ? { id: req.user._id, name: req.user.name } : 'NO USER');
      console.log('4. Request method:', req.method);
      console.log('5. Request URL:', req.url);
      
      const { chatId, content, messageType = 'text', fileUrl = '', fileName = '' } = req.body;
      const senderId = req.user._id;

      console.log('6. Extracted values:');
      console.log('   - chatId:', chatId, '(type:', typeof chatId, ')');
      console.log('   - content:', content, '(type:', typeof content, ')');
      console.log('   - senderId:', senderId, '(type:', typeof senderId, ')');
      console.log('   - messageType:', messageType);

      if (!chatId) {
        console.log(' VALIDATION FAILED: chatId is missing or falsy');
        return res.status(400).json({
          success: false,
          message: 'Chat ID is required',
          debug: { chatId, content, senderId }
        });
      }

      if (!content) {
        console.log(' VALIDATION FAILED: content is missing or falsy');
        return res.status(400).json({
          success: false,
          message: 'Content is required',
          debug: { chatId, content, senderId }
        });
      }

      if (!senderId) {
        console.log(' VALIDATION FAILED: senderId is missing or falsy');
        return res.status(400).json({
          success: false,
          message: 'User authentication failed',
          debug: { chatId, content, senderId }
        });
      }

      console.log(' All validations passed, calling messageService...');

      const message = await messageService.sendMessage(
        chatId, 
        senderId, 
        content, 
        messageType, 
        fileUrl, 
        fileName
      );

      console.log(' Message created successfully:', message._id);

      // Emit message to all participants via Socket.IO
      if (req.io) {
        req.io.to(chatId).emit('new_message', message);
        console.log(' Socket.IO message emitted');
      } else {
        console.log('⚠️ Socket.IO not available');
      }

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('MESSAGE CONTROLLER ERROR:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getChatMessages: async (req, res) => {
    try {
      const { chatId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user._id;

      const result = await messageService.getChatMessages(
        chatId, 
        userId, 
        parseInt(page), 
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;

      await messageService.markMessagesAsRead(chatId, userId);

      res.status(200).json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  deleteMessage: async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user._id;

      const result = await messageService.deleteMessage(messageId, userId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user._id;
      const count = await messageService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: { unreadCount: count }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = messageController;