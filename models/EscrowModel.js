const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'funded', 'disputed', 'released', 'refunded'],
    default: 'pending'
  },
  fundedAt: {
    type: Date
  },
  releasedAt: {
    type: Date
  },
  disputeReason: {
    type: String
  },
  adminNotes: {
    type: String
  },
  releaseConditions: {
    deliveryConfirmation: {
      type: Boolean,
      default: false
    },
    inspectionPeriod: {
      type: Number,
      default: 7
    },
    autoReleaseDate: {
      type: Date
    }
  },
  paymentDetails: {
    provider: {
      type: String,
      enum: ['paystack', 'flutterwave']
    },
    reference: String,
    accessCode: String,
    authorizationUrl: String,
    transactionId: String,
    channel: String,
    gatewayResponse: String
  },
  transactionHistory: [{
    action: {
      type: String,
      enum: ['created', 'funded', 'disputed', 'released', 'refunded', 'admin_intervention', 'payment_initialized', 'payment_verified']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}, { timestamps: true });

const Escrow = mongoose.model('Escrow', escrowSchema);

module.exports = Escrow;