const chatService = require('../services/chatService');
const User = require('../models/UserModel'); 

const chatController = {
  getUserChats: async (req, res) => {
    try {
      const userId = req.user._id; 
      const chats = await chatService.getUserChats(userId);
      
      res.status(200).json({
        success: true,
        data: chats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  createChat: async (req, res) => {
    try {
      const { participantId } = req.body;
      const userId = req.user._id; 

      if (!participantId) {
        return res.status(400).json({
          success: false,
          message: 'Participant ID is required'
        });
      }

      if (participantId === userId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create chat with yourself'
        });
      }

      const participant = await User.findById(participantId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const chat = await chatService.createOrGetChat(userId, participantId);
      
      res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  getChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user._id; 

      const chat = await chatService.getChatById(chatId, userId);
      
      res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  deleteChat: async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.user._id; 

      const result = await chatService.deleteChat(chatId, userId);
      
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

  searchUsers: async (req, res) => {
    try {
      const { query } = req.query;
      const userId = req.user._id; 

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const users = await User.find({
        _id: { $ne: userId },
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      }).select('name email avatar role').limit(10);

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = chatController;