const express = require('express');
const authenticateUser = require('../middlewares/authmiddleware');
const { avatarUpload } = require('../utils/multer');
const { updateBuyerProfile } = require('../controllers/updateBuyer');

const router = express.Router();

router.put(
  '/update-buyer',
  authenticateUser,
  avatarUpload.single('avatar'), 
  updateBuyerProfile
);

module.exports = router;
