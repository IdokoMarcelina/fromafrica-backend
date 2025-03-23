require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const connectDB = require('./config/connectDB')

const authRoutes = require('./routes/authRoutes')


const app = express()

app.use(express.json())

connectDB()
port = process.env.PORT || 3000


app.use('/api/v1', authRoutes )


app.get('/', (req,res)=>{

    res.send(`welcome, server running on port ${port}`)
})

app.listen(port, ()=>{
    console.log(`server running on port ${port}` );
    
})