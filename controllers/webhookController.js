const crypto = require('crypto');
const Escrow = require('../models/EscrowModel');
const Order = require('../models/orderModel');
const PaymentService = require('../services/paymentService');

const verifyPaystackSignature = (payload, signature) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
};

const verifyFlutterwaveSignature = (payload, signature) => {
  const hash = crypto
    .createHmac('sha256', process.env.FLW_SECRET_HASH)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
};

const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const payload = req.body;

    // Verify webhook signature
    if (!verifyPaystackSignature(payload, signature)) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const { event, data } = payload;

    if (event === 'charge.success') {
      const { reference, status, amount, metadata } = data;

      if (status === 'success' && metadata && metadata.escrowId) {
        const escrow = await Escrow.findById(metadata.escrowId);
        
        if (escrow && escrow.status === 'pending' && escrow.paymentDetails.reference === reference) {
          // Verify amount matches
          if ((amount / 100) === escrow.amount) {
            escrow.status = 'funded';
            escrow.fundedAt = new Date();
            escrow.paymentDetails.transactionId = data.id;
            escrow.paymentDetails.channel = data.channel;
            escrow.paymentDetails.gatewayResponse = data.gateway_response;

            escrow.transactionHistory.push({
              action: 'payment_verified',
              performedBy: escrow.buyer,
              notes: `Payment verified via webhook - ${data.channel} - ${data.gateway_response}`
            });

            escrow.transactionHistory.push({
              action: 'funded',
              performedBy: escrow.buyer,
              notes: `Escrow auto-funded via Paystack webhook - Amount: ${escrow.amount}`
            });

            await escrow.save();

            console.log(`Escrow ${escrow._id} auto-funded via Paystack webhook`);
          }
        }
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const payload = req.body;

    // Verify webhook signature
    if (!verifyFlutterwaveSignature(payload, signature)) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const { event, data } = payload;

    if (event === 'charge.completed') {
      const { tx_ref, status, amount, meta } = data;

      if (status === 'successful' && meta && meta.escrowId) {
        const escrow = await Escrow.findById(meta.escrowId);
        
        if (escrow && escrow.status === 'pending' && escrow.paymentDetails.reference === tx_ref) {
          // Verify amount matches
          if (amount === escrow.amount) {
            escrow.status = 'funded';
            escrow.fundedAt = new Date();
            escrow.paymentDetails.transactionId = data.id;
            escrow.paymentDetails.channel = data.payment_type;
            escrow.paymentDetails.gatewayResponse = data.processor_response;

            escrow.transactionHistory.push({
              action: 'payment_verified',
              performedBy: escrow.buyer,
              notes: `Payment verified via webhook - ${data.payment_type} - ${data.processor_response}`
            });

            escrow.transactionHistory.push({
              action: 'funded',
              performedBy: escrow.buyer,
              notes: `Escrow auto-funded via Flutterwave webhook - Amount: ${escrow.amount}`
            });

            await escrow.save();

            console.log(`Escrow ${escrow._id} auto-funded via Flutterwave webhook`);
          }
        }
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

const handlePaymentCallback = async (req, res) => {
  try {
    const { reference, trxref, transaction_id, status, provider } = req.query;
    
    // Determine the payment reference based on provider
    const paymentRef = reference || trxref;
    const paymentProvider = provider || (reference ? 'paystack' : 'flutterwave');
    
    if (!paymentRef) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Invalid payment reference`);
    }

    // Find escrow by payment reference
    const escrow = await Escrow.findOne({ 
      'paymentDetails.reference': paymentRef 
    }).populate('buyer order');

    if (!escrow) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Escrow not found`);
    }

    // If already funded, redirect to success
    if (escrow.status === 'funded') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?reference=${paymentRef}&escrow=${escrow._id}`);
    }

    // Verify payment with the payment provider
    const verificationResult = await PaymentService.verifyPayment(
      paymentRef,
      paymentProvider,
      transaction_id
    );

    if (verificationResult.success && verificationResult.data.amount === escrow.amount) {
      // Update escrow status
      escrow.status = 'funded';
      escrow.fundedAt = new Date();
      escrow.paymentDetails.transactionId = transaction_id;
      escrow.paymentDetails.channel = verificationResult.data.channel;
      escrow.paymentDetails.gatewayResponse = verificationResult.data.gateway_response;

      escrow.transactionHistory.push({
        action: 'payment_verified',
        performedBy: escrow.buyer._id,
        notes: `Payment verified via callback - ${verificationResult.data.channel}`
      });

      escrow.transactionHistory.push({
        action: 'funded',
        performedBy: escrow.buyer._id,
        notes: `Escrow funded via ${paymentProvider} callback - Amount: ${escrow.amount}`
      });

      await escrow.save();

      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?reference=${paymentRef}&escrow=${escrow._id}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Payment verification failed&reference=${paymentRef}`);
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Payment processing error`);
  }
};

module.exports = {
  handlePaystackWebhook,
  handleFlutterwaveWebhook,
  handlePaymentCallback
};