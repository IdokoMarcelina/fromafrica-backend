const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ['buyer', 'seller', 'admin'],
    required: true,
  },

  phone: {
    type: String,
  },

  avatar: {
    type: String,
    default: "https://www.pngegg.com/en/search?q=avatar",
  },

  address: {
    type: String,
  },

  buyerCode: {
    type: String,
  },

  sellerDetails: {
    companyName: String,
    country: String,
    state: String,
    shippingAddress: String,
    officeAddress: String,
    socialMedia: String,
    businessRegNo: String,
    cacNo: String,
    certImage: String,
    taxId: String,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  businessStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },

  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    autoApproveUsers: { type: Boolean, default: false },
  },
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'active'],
    default: 'inactive',
  },

  subscriptionPlan: {
    type: String, // e.g., 'paid', 'waiver'
    default: null,
  },

  subscriptionExpiresAt: {
    type: Date,
    default: null,
  },

  hasUsedWaiver: {
    type: Boolean,
    default: false,
  },


}, { timestamps: true });


// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
