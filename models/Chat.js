const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  chatName: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true 
});

// Index for better query performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;