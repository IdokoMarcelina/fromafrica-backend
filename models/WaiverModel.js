const mongoose = require('mongoose');

const waiverSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('Waiver', waiverSchema);
