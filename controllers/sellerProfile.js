const User = require('../models/UserModel');
const cloudinary = require('cloudinary').v2;

const editBusinessInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      phone,
      companyName,
      country,
      officeAddress
    } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' });
    }

    if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path);
        user.avatar = result.secure_url;
      }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.sellerDetails.companyName = companyName || user.sellerDetails.companyName;
    user.sellerDetails.country = country || user.sellerDetails.country;
    user.sellerDetails.officeAddress = officeAddress || user.sellerDetails.officeAddress;

    await user.save();

    res.status(200).json({
      message: 'Business information updated successfully',
      user: {
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        sellerDetails: user.sellerDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update business info',
      error: error.message
    });
  }
};

const editCompanyInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      businessRegNo,
      companyName,
      cacNo,
      taxId
    } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' });
    }

    let certImageUrl = user.sellerDetails.certImage;

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path);
      certImageUrl = uploadResult.secure_url;
    }

    user.sellerDetails.businessRegNo = businessRegNo || user.sellerDetails.businessRegNo;
    user.sellerDetails.companyName = companyName || user.sellerDetails.companyName;
    user.sellerDetails.cacNo = cacNo || user.sellerDetails.cacNo;
    user.sellerDetails.certImage = certImageUrl;
    user.sellerDetails.taxId = taxId || user.sellerDetails.taxId;

    await user.save();

    res.status(200).json({
      message: 'Company information updated successfully',
      sellerDetails: user.sellerDetails
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update company info',
      error: error.message
    });
  }
};

module.exports = {
  editBusinessInfo,
  editCompanyInfo
};
