const User = require('../models/UserModel');
const cloudinary = require('cloudinary').v2;

const updateBuyerProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, address, phone, buyerCode } = req.body;

    const user = await User.findById(userId);

    if (!user || user.role !== 'buyer') {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path);
      user.avatar = uploadResult.secure_url;
    }

    user.name = name || user.name;
    user.address = address || user.address;
    user.phone = phone || user.phone;
    user.buyerCode = buyerCode || user.buyerCode;

    await user.save();

    res.status(200).json({
      message: 'Buyer profile updated successfully',
      user: {
        name: user.name,
        phone: user.phone,
        address: user.address,
        buyerCode: user.buyerCode,
        avatar: user.avatar,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update buyer profile',
      error: error.message
    });
  }
};

module.exports = {
  updateBuyerProfile
};
