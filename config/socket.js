const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const configureSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected: ${socket.id}`);

    socket.join(socket.userId);

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.user.name} joined chat: ${chatId}`);
    });

    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
      console.log(`User ${socket.user.name} left chat: ${chatId}`);
    });

    socket.on('typing_start', (data) => {
      socket.to(data.chatId).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        chatId: data.chatId
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(data.chatId).emit('user_stop_typing', {
        userId: socket.userId,
        chatId: data.chatId
      });
    });

    socket.on('user_online', () => {
      socket.broadcast.emit('user_status', {
        userId: socket.userId,
        status: 'online'
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected: ${socket.id}`);
      socket.broadcast.emit('user_status', {
        userId: socket.userId,
        status: 'offline'
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = configureSocket;