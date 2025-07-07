const express = require('express')
const { addProduct, getAllProducts, getSellerProducts, getSingleProduct, editProduct, deleteProduct } = require('../controllers/productController')
const cloudinary = require('cloudinary').v2
const { productPicUpload } = require('../utils/multer')
const authenticateUser = require('../middlewares/authmiddleware')
const isSeller = require('../middlewares/isSeller')
const router = express.Router()


router.post('/addProduct', authenticateUser, isSeller, productPicUpload.array('productPic'), addProduct)
router.post('/add', productPicUpload.array('productPic'), addProduct)
router.get('/get-all-products',getAllProducts),
router.get('/my-products',authenticateUser, isSeller, getSellerProducts),
router.get('/getSingleProduct/:id',getSingleProduct),
router.put('/editproduct/:id',authenticateUser, isSeller, editProduct),
router.delete('/deleteProduct/:id',authenticateUser, isSeller, deleteProduct),

module.exports = router