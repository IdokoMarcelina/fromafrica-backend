const express = require('express');
const router = express.Router();
const { 
  handlePaystackWebhook,
  handleFlutterwaveWebhook,
  handlePaymentCallback
} = require('../controllers/webhookController');

// Raw body middleware for webhook signature verification
const rawBodyMiddleware = express.raw({ type: 'application/json' });

// Webhook endpoints
router.post('/paystack', rawBodyMiddleware, handlePaystackWebhook);
router.post('/flutterwave', rawBodyMiddleware, handleFlutterwaveWebhook);

// Payment callback endpoint (for redirect after payment)
router.get('/payment/callback', handlePaymentCallback);

module.exports = router;