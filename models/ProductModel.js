const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    productName : {
        type: String,
        required: true
    },
    description : {
        type: String,
        required: true
    },
    category : {
        type: String,
        required: true
    },
    tags : {
        type: [String],
        required: true
    },
    shortDescription : {
        type: String,
        required: true
    },
    status : {
        type: String,
        required: true
    },
    visibility : {
        type: String,
        required: true
    },
    publishSchedule : {
        type: Date,
        required: true
    },
    manufacturerName : {
        type: String,
        required: true
    },
    brand : {
        type: String,
        required: true
    },
    stocks : {
        type: Number,
        required: true
    },
    price : {
        type: Number,
        required: true
    },
    discount : {
        type: String,
        required: true
    },
    productPic : {
        type: String,
        required: true
    },
    
   
}, 

{ timestamps : true}

)

const Product = mongoose.model('Product', productSchema)

module.exports = Product