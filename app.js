require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const connectDB = require('./config/connectDB')
const cloudinary = require('cloudinary').v2

const authRoutes = require('./routes/authRoutes')
const productRoutes = require('./routes/productRoutes')


const app = express()

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