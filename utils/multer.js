const multer = require('multer')
const cloudinary = require('../utils/cloudinary')
const {CloudinaryStorage} = require('multer-storage-cloudinary')
const path = require('path')

const productPicStorage = new multer.diskStorage({
    filename: (req,file,cb)=>{
        cb(null, Date.now()+ path.extname(file.originalname))
    }

})

const certImageStorage = new multer.diskStorage({
    filename: (req,file,cb)=>{
        cb(null, Date.now()+ path.extname(file.originalname))
    }

})
const avatarStorage = new multer.diskStorage({
    filename: (req,file,cb)=>{
        cb(null, Date.now()+ path.extname(file.originalname))
    }

})



// const avatarStorage = new CloudinaryStorage({
//     filename:(req,file,cb)=>{
//         cb(null, Date.now() + path.extname(file.originalname))
//     }
// })




const productPicUpload = multer({ storage: productPicStorage});
const certImageUpload = multer({ storage: certImageStorage });
const avatarUpload = multer({ storage: avatarStorage });
// const avatarUpload = multer({storage: avatarStorage})

module.exports = {
    productPicUpload,
    certImageUpload,
    avatarUpload
}
