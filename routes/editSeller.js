const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authmiddleware');
const isSeller = require('../middlewares/isSeller');
const { upload, certImageUpload, avatarUpload } = require('../utils/multer');
const { editBusinessInfo, editCompanyInfo } = require('../controllers/sellerProfile');

router.put('/edit-business-info', authenticateUser, isSeller, avatarUpload.single('avatar'), editBusinessInfo);

router.put('/edit-company-info', authenticateUser, isSeller, certImageUpload.single('certImage'), editCompanyInfo);

module.exports = router
