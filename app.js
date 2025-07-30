require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/connectDB');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const cookieParser = require('cookie-parser');

const User = require('./models/UserModel');
const Chat = require('./models/ChatModel');
const Message = require('./models/MessageModel');

const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

const allowedOrigins = [
  'https://africa-eta.vercel.app/reg',
  'https://africa-kappa.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const editSeller = require('./routes/editSeller');
const sellerDashboard = require('./routes/sellerdashboard');
const updateBuyer = require('./routes/updateBuyer');

connectDB();
port = process.env.PORT || 3000;

io.on("connection", (socket) => {
  socket.on('chat_message', (msg) => {
    io.emit('chat_message_' + msg.receiverId, msg);
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });

  socket.on('disconnect', (socket) => {
    console.log('User disconnected:', socket.id);
  });
});

app.use('/api/v1', authRoutes);
app.use('/api/v1', productRoutes);
app.use('/api/v1', editSeller);
app.use('/api/v1', sellerDashboard);
app.use('/api/v1', updateBuyer);

app.get('/', (req, res) => {
  res.send(`welcome, server running on port ${port}`);
});

app.post('/api/v1/createChat', async (req, res) => {
  try {
    const { firstId, secondId } = req.body;

    if (!firstId || !secondId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const objFirstId = new mongoose.Types.ObjectId(firstId);
    const objSecondId = new mongoose.Types.ObjectId(secondId);

    let chat = await Chat.findOne({
      members: { $all: [objFirstId, objSecondId] },
    });

    if (chat) {
      chat.updatedAt = new Date();
      await chat.save();
      return res.status(200).json({
        message: "Chat already exists, updated timestamp.",
        data: chat,
      });
    }

    const newChat = new Chat({
      members: [objFirstId, objSecondId],
    });

    const savedChat = await newChat.save();
    res.status(201).json({ message: "Chat created", data: savedChat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/findUserChats/:userId', async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.params.userId);

  try {
    const chats = await Chat.find({
      members: { $in: [userId] },
    });

    const otherMemberIds = chats.map((chat) => {
      return chat.members
        .map((id) => new mongoose.Types.ObjectId(id))
        .find((member) => !member.equals(userId));
    });

    const otherMembers = await User.find({ _id: { $in: otherMemberIds } })

    const result = chats.map((chat) => {
      const otherMemberId = chat.members
        .map((id) => new mongoose.Types.ObjectId(id))
        .find((member) => !member.equals(userId));

      const otherMember = otherMembers.find((user) =>
        user._id.equals(otherMemberId)
      );

      return {
        id: chat._id,
        members: chat.members,
        otherMember: otherMember
          ? {
              id: otherMember._id,
              name: otherMember.name,
              profilePicture: otherMember.avatar,
            }
          : null,
      };
    }).filter((chat) => chat.otherMember !== null);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json(error);
  }
});


app.get('/api/v1/findChat/:firstId/:secondId', async (req, res) => {
  const { firstId, secondId } = req.params;

    const userIdStr = req.params.userId;
  const userId = new mongoose.Types.ObjectId(userIdStr);

  try {
    const objFirstId = new mongoose.Types.ObjectId(firstId);
    const objSecondId = new mongoose.Types.ObjectId(secondId);

    const chat = await Chat.find({
      members: { $all: [objFirstId, objSecondId] },
    });
    console.log("Raw chats for userId", userId.toString(), chat);

    res.status(200).json(chat);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

app.post('/api/v1/createMessage', async (req, res) => {
  const { chatId, senderId, receiverId, text } = req.body;

  if (!chatId || !senderId || !receiverId || !text) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const message = new Message({
    chatId: new mongoose.Types.ObjectId(chatId),
    senderId: new mongoose.Types.ObjectId(senderId),
    receiverId: new mongoose.Types.ObjectId(receiverId),
    text,
  });

  try {
    const response = await message.save();

    let emit = io.emit('chat_message_' + receiverId, {
      chatId,
      senderId,
      receiverId,
      text,
    });

    console.log(emit, 'chat_message_' + receiverId);

    res.status(200).json(response);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// app.get('/api/v1/getMessages/:chatId', async (req, res) => {
//   const { chatId } = req.params;

//   try {
//     const messages = await Message.find({ chatId });
//     // const messages = await Message.find({ chatId: new mongoose.Types.ObjectId(chatId) });
//     res.status(200).json(messages);
//   } catch (error) {
//     res.status(500).json(error);
//   }
// });

app.get('/api/v1/getMessages/:chatId', async (req, res) => {
  const { chatId } = req.params;
  const chatIdObj = new mongoose.Types.ObjectId(chatId);
  console.log("📥 chatId from params:", chatId, "| type:", typeof chatId);


  console.log("🔍 Received GET /getMessages request");
  console.log("📥 chatId from params:", chatId);

  try {
    // const messages = await Message.find({ chatId });
    // const messages = await Message.find({ chatId: new mongoose.Types.ObjectId(chatId) });
    // const messages = await Message.find({
    //   $or: [
    //     { chatId: chatId },
    //     { chatId: chatIdObj },
    //   ],
    // });
    await Message.updateMany(
      { chatId: { $type: "string" } },
      [{ $set: { chatId: { $toObjectId: "$chatId" } } }]
    );


    console.log("📦 Fetched messages:", messages);

    if (!messages.length) {
      console.log("⚠️ No messages found for chatId:", chatId);
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json(error);
  }
});


app.get('/api/v1/getSidebarMessages/:userId', async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.params.userId);

  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId },
      ]
    });

    if (!messages || messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this user' });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error('Failed to fetch sidebar messages:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar messages' });
  }
});

app.listen(port, () => {
  console.log(`server running on port ${port}`)
});