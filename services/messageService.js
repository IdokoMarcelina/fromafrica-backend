const Message = require('../models/Message');
const Chat = require('../models/Chat');

class MessageService {
  async sendMessage(chatId, senderId, content, messageType = 'text', fileUrl = '', fileName = '') {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        participants: senderId
      });

      if (!chat) {
        throw new Error('Chat not found or unauthorized');
      }

      const message = new Message({
        chat: chatId,
        sender: senderId,
        content,
        messageType,
        fileUrl,
        fileName
      });

      await message.save();

      chat.lastMessage = message._id;
      chat.lastMessageAt = new Date();
      await chat.save();

      await message.populate('sender', 'name email avatar role');

      return message;
    } catch (error) {
      throw new Error(`Error sending message: ${error.message}`);
    }
  }

  async getChatMessages(chatId, userId, page = 1, limit = 50) {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        throw new Error('Chat not found or unauthorized');
      }

      const skip = (page - 1) * limit;

      const messages = await Message.find({
        chat: chatId,
        isDeleted: false
      })
      .populate('sender', 'name email avatar role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

      const totalMessages = await Message.countDocuments({
        chat: chatId,
        isDeleted: false
      });

      return {
        messages: messages.reverse(),
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages
      };
    } catch (error) {
      throw new Error(`Error fetching messages: ${error.message}`);
    }
  }

  async markMessagesAsRead(chatId, userId) {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        throw new Error('Chat not found or unauthorized');
      }

      await Message.updateMany(
        {
          chat: chatId,
          sender: { $ne: userId },
          'readBy.user': { $ne: userId }
        },
        {
          $addToSet: {
            readBy: {
              user: userId,
              readAt: new Date()
            }
          }
        }
      );

      return { message: 'Messages marked as read' };
    } catch (error) {
      throw new Error(`Error marking messages as read: ${error.message}`);
    }
  }

  async deleteMessage(messageId, userId) {
    try {
      const message = await Message.findOne({
        _id: messageId,
        sender: userId
      });

      if (!message) {
        throw new Error('Message not found or unauthorized');
      }

      message.isDeleted = true;
      await message.save();

      return { message: 'Message deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting message: ${error.message}`);
    }
  }

  async getUnreadCount(userId) {
    try {
      const chats = await Chat.find({ participants: userId });
      const chatIds = chats.map(chat => chat._id);

      const unreadCount = await Message.countDocuments({
        chat: { $in: chatIds },
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
        isDeleted: false
      });

      return unreadCount;
    } catch (error) {
      throw new Error(`Error getting unread count: ${error.message}`);
    }
  }
}

module.exports = new MessageService();