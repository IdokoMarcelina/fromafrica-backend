// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const connectDB = require('./config/connectDB');
// const cloudinary = require('cloudinary').v2;
// const cors = require('cors');
// const cookieParser = require('cookie-parser');


// const app = express();
// const http = require("http");
// const server = http.createServer(app);
// const { Server } = require("socket.io");
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   },
// });

// const allowedOrigins = [
//   'https://africa-eta.vercel.app/reg',
//   'https://africa-kappa.vercel.app',
//   'http://localhost:3000',
//   'http://localhost:5173',
//   'http://localhost:5174',
//   'http://localhost:5175',
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
// }));

// app.use(express.json());
// app.use(cookieParser());

// const authRoutes = require('./routes/authRoutes');
// const productRoutes = require('./routes/productRoutes');
// const editSeller = require('./routes/editSeller');
// const sellerDashboard = require('./routes/sellerdashboard');
// const updateBuyer = require('./routes/updateBuyer');

// connectDB();
// port = process.env.PORT || 3000;

// io.on("connection", (socket) => {
//   socket.on('chat_message', (msg) => {
//     io.emit('chat_message_' + msg.receiverId, msg);
//   });

//   socket.on('error', (err) => {
//     console.error('Socket error:', err);
//   });

//   socket.on('disconnect', (socket) => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// app.use('/api/v1', authRoutes);
// app.use('/api/v1', productRoutes);
// app.use('/api/v1', editSeller);
// app.use('/api/v1', sellerDashboard);
// app.use('/api/v1', updateBuyer);

// app.get('/', (req, res) => {
//   res.send(`welcome, server running on port ${port}`);
// });

// app.listen(port, () => {
//   console.log(`server running on port ${port}`)
// });


// Make sure your app.js has this exact order:

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/connectDB');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

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

// CRITICAL: These middleware must come BEFORE routes
app.use(express.json()); // This parses JSON bodies
app.use(cookieParser());

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Add debug middleware to see all requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const editSeller = require('./routes/editSeller');
const sellerDashboard = require('./routes/sellerdashboard');
const updateBuyer = require('./routes/updateBuyer');
const chatRoutes = require('./routes/chatRoutes'); // MAKE SURE THIS IS IMPORTED

connectDB();

const port = process.env.PORT || 3000;

// Socket.IO configuration
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

// Use routes - MAKE SURE CHAT ROUTES ARE REGISTERED
app.use('/api/v1', authRoutes);
app.use('/api/v1', productRoutes);
app.use('/api/v1', editSeller);
app.use('/api/v1', sellerDashboard);
app.use('/api/v1', updateBuyer);
app.use('/api/v1', chatRoutes); // CRITICAL: Make sure this line exists

app.get('/', (req, res) => {
  res.send(`welcome, server running on port ${port}`);
});

// Use server.listen instead of app.listen for Socket.IO
server.listen(port, () => {
  console.log(`server running on port ${port}`)
});