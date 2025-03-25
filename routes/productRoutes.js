const express = require('express')
const { addProduct } = require('../controllers/productController')
const cloudinary = require('cloudinary').v2
const { productPicUpload } = require('../utils/multer')
const router = express.Router()


router.post('/addProduct',productPicUpload.array('productPic'), addProduct)

module.exports = router