const axios = require('axios');
const Flutterwave = require('flutterwave-node-v3');
const MockPaymentService = require('./mockPaymentService');

// Auto-detect if we should use mock service
const USE_MOCK_PAYMENTS = !process.env.PAYSTACK_SECRET_KEY || !process.env.FLW_SECRET_KEY || process.env.NODE_ENV === 'development';

const flw = process.env.FLW_SECRET_KEY ? new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY) : null;

class PaymentService {
  
  static async initializePaystackPayment(paymentData) {
    try {
      const { email, amount, reference, metadata } = paymentData;
      
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: amount * 100, // Convert to kobo
          reference,
          metadata,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data.data,
        provider: 'paystack'
      };
    } catch (error) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Payment initialization failed',
        provider: 'paystack'
      };
    }
  }

  static async initializeFlutterwavePayment(paymentData) {
    try {
      const { email, amount, reference, metadata, phoneNumber, name } = paymentData;
      
      const payload = {
        tx_ref: reference,
        amount,
        currency: 'NGN',
        redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
        customer: {
          email,
          phonenumber: phoneNumber,
          name
        },
        customizations: {
          title: 'FromAfrica Payment',
          description: 'Escrow payment for order',
          logo: `${process.env.FRONTEND_URL}/logo.png`
        },
        meta: metadata,
        payment_options: 'card,banktransfer,ussd,mobilemoney'
      };

      const response = await flw.Charge.card(payload);
      
      if (response.status === 'success') {
        return {
          success: true,
          data: {
            authorization_url: response.data.link,
            access_code: response.data.access_code,
            reference: response.data.tx_ref
          },
          provider: 'flutterwave'
        };
      } else {
        return {
          success: false,
          error: response.message || 'Payment initialization failed',
          provider: 'flutterwave'
        };
      }
    } catch (error) {
      console.error('Flutterwave initialization error:', error.message);
      return {
        success: false,
        error: error.message || 'Payment initialization failed',
        provider: 'flutterwave'
      };
    }
  }

  static async verifyPaystackPayment(reference) {
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const { data } = response.data;
      
      return {
        success: data.status === 'success',
        data: {
          reference: data.reference,
          amount: data.amount / 100, // Convert from kobo
          status: data.status,
          gateway_response: data.gateway_response,
          paid_at: data.paid_at,
          channel: data.channel,
          metadata: data.metadata
        },
        provider: 'paystack'
      };
    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Payment verification failed',
        provider: 'paystack'
      };
    }
  }

  static async verifyFlutterwavePayment(transactionId) {
    try {
      const response = await flw.Transaction.verify({ id: transactionId });
      
      if (response.status === 'success' && response.data.status === 'successful') {
        return {
          success: true,
          data: {
            reference: response.data.tx_ref,
            amount: response.data.amount,
            status: response.data.status,
            gateway_response: response.data.processor_response,
            paid_at: response.data.created_at,
            channel: response.data.payment_type,
            metadata: response.data.meta
          },
          provider: 'flutterwave'
        };
      } else {
        return {
          success: false,
          error: response.message || 'Payment verification failed',
          provider: 'flutterwave'
        };
      }
    } catch (error) {
      console.error('Flutterwave verification error:', error.message);
      return {
        success: false,
        error: error.message || 'Payment verification failed',
        provider: 'flutterwave'
      };
    }
  }

  static generatePaymentReference(escrowId, provider) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${provider.toUpperCase()}_${escrowId}_${timestamp}_${random}`;
  }

  static async initializePayment(paymentData, provider = 'paystack') {
    // Use mock service if API keys not configured
    if (USE_MOCK_PAYMENTS) {
      console.log('🔧 Using Mock Payment Service (Development Mode)');
      return await MockPaymentService.initializePayment(paymentData, provider);
    }

    const reference = this.generatePaymentReference(paymentData.escrowId, provider);
    
    const paymentPayload = {
      ...paymentData,
      reference,
      metadata: {
        escrowId: paymentData.escrowId,
        orderId: paymentData.orderId,
        provider,
        ...paymentData.metadata
      }
    };

    if (provider === 'paystack') {
      return await this.initializePaystackPayment(paymentPayload);
    } else if (provider === 'flutterwave') {
      return await this.initializeFlutterwavePayment(paymentPayload);
    } else {
      return {
        success: false,
        error: 'Invalid payment provider',
        provider
      };
    }
  }

  static async verifyPayment(reference, provider, transactionId = null, expectedAmount = null) {
    // Use mock service if API keys not configured
    if (USE_MOCK_PAYMENTS) {
      console.log('🔧 Using Mock Payment Verification (Development Mode)');
      return await MockPaymentService.verifyPayment(reference, provider, transactionId, expectedAmount);
    }

    if (provider === 'paystack') {
      return await this.verifyPaystackPayment(reference);
    } else if (provider === 'flutterwave') {
      return await this.verifyFlutterwavePayment(transactionId || reference);
    } else {
      return {
        success: false,
        error: 'Invalid payment provider',
        provider
      };
    }
  }

  static async refundPayment(reference, amount, provider, reason = 'Escrow refund') {
    try {
      // Use mock service if API keys not configured
      if (USE_MOCK_PAYMENTS) {
        console.log('🔧 Using Mock Payment Refund (Development Mode)');
        return await MockPaymentService.refundPayment(reference, amount, provider, reason);
      }

      if (provider === 'paystack') {
        const response = await axios.post(
          'https://api.paystack.co/refund',
          {
            transaction: reference,
            amount: amount * 100, // Convert to kobo
            reason
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        return {
          success: response.data.status,
          data: response.data.data,
          provider: 'paystack'
        };
      } else if (provider === 'flutterwave') {
        // Flutterwave refund implementation
        const response = await axios.post(
          'https://api.flutterwave.com/v3/transactions/refund',
          {
            id: reference,
            amount,
            comments: reason
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        return {
          success: response.data.status === 'success',
          data: response.data.data,
          provider: 'flutterwave'
        };
      }
    } catch (error) {
      console.error(`${provider} refund error:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Refund failed',
        provider
      };
    }
  }
}

module.exports = PaymentService;