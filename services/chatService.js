
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/UserModel'); 

class ChatService {
  async getUserChats(userId) {
    try {
      const chats = await Chat.find({
        participants: userId
      })
      .populate('participants', 'name email avatar role')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

      return chats;
    } catch (error) {
      throw new Error(`Error fetching user chats: ${error.message}`);
    }
  }

  async createOrGetChat(user1Id, user2Id) {
    try {
      let chat = await Chat.findOne({
        participants: { $all: [user1Id, user2Id], $size: 2 },
        isGroupChat: false
      }).populate('participants', 'name email avatar role');

      if (!chat) {
        chat = new Chat({
          participants: [user1Id, user2Id]
        });
        await chat.save();
        
        chat = await Chat.findById(chat._id)
          .populate('participants', 'name email avatar role');
      }

      return chat;
    } catch (error) {
      throw new Error(`Error creating/getting chat: ${error.message}`);
    }
  }

  async getChatById(chatId, userId) {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      }).populate('participants', 'name email avatar role');

      if (!chat) {
        throw new Error('Chat not found or unauthorized');
      }

      return chat;
    } catch (error) {
      throw new Error(`Error fetching chat: ${error.message}`);
    }
  }

  async deleteChat(chatId, userId) {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId
      });

      if (!chat) {
        throw new Error('Chat not found or unauthorized');
      }

      await Message.deleteMany({ chat: chatId });
      
      await Chat.findByIdAndDelete(chatId);

      return { message: 'Chat deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting chat: ${error.message}`);
    }
  }
}

module.exports = new ChatService();