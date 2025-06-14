require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const connectDB = require('./config/connectDB')
const cloudinary = require('cloudinary').v2
const cors = require('cors')

const authRoutes = require('./routes/authRoutes')
const productRoutes = require('./routes/productRoutes')


const app = express()
// app.use(cors(
//     {
//         origin: '*',
//         credentials: true,
//     }
// ));


const allowedOrigins = [
    'https://africa-eta.vercel.app/reg',
    'https://africa-kappa.vercel.app/',
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
    credentials: true, // <-- this is the missing part
  }));
  
app.use(express.json())

connectDB()
port = process.env.PORT || 3000


app.use('/api/v1', authRoutes )
app.use('/api/v1', productRoutes )


app.get('/', (req,res)=>{

    res.send(`welcome, server running on port ${port}`)
})

app.listen(port, ()=>{
    console.log(`server running on port ${port}` );
    
})