
const mongoose = require('mongoose')

const connectDB = async ()=>{

    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('db connected');
        
    } catch (error) {
        console.log(`failed to connect to db ${error}`);
        
    }
}

module.exports = connectDB