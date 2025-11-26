const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  fee: { type: Number, required: true }, // subscription fee in your currency
  currency: { type: String, default: 'NGN' }, 
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
