const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false  // Optional - null for registration, set for forgot-password
  },
  email: { 
    type: String, 
    required: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['registration', 'forgot-password'],
    required: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  expires_at: { 
    type: Date, 
    required: true 
  }
});

// Auto-delete expired OTPs
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Compound index for email + type uniqueness
otpSchema.index({ email: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Otp', otpSchema);
