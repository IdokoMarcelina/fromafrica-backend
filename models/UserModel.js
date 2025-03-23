
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ['buyer', 'seller'],
        required: true
    },
    phone: {
        type: String
    },
    avatar: {
        type: String,
        default: "https://www.pngegg.com/en/search?q=avatar",
    },
    address: {
        type: String
    },

    sellerDetails: {
    companyName: String,
    country: String,
    state: String,
    shippingAddress: String,
    socialMedia: String,
  },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
}, { timestamps: true })



userSchema.pre("save", async function (next) {

    if(!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt)

    next();
    
})

const User = mongoose.model( 'User', userSchema)

module.exports = User