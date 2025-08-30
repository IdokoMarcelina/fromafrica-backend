// Mock Payment Service for Development/Testing
// USE ONLY FOR DEVELOPMENT - NOT PRODUCTION!

class MockPaymentService {
  static async initializePayment(paymentData, provider = 'paystack') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const reference = `MOCK_${provider.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Mock successful initialization - use local mock payment page
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    return {
      success: true,
      data: {
        authorization_url: `${baseUrl}/mock-payment.html?ref=${reference}&provider=${provider}&amount=${paymentData.amount}`,
        access_code: `mock_access_${reference}`,
        reference: reference
      },
      provider
    };
  }

  static async verifyPayment(reference, provider, transactionId = null, expectedAmount = null) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock successful payment verification
    return {
      success: true,
      data: {
        reference: reference,
        amount: expectedAmount || 1000, // Use expected amount or default
        status: 'success',
        gateway_response: 'Approved by Mock Gateway',
        paid_at: new Date().toISOString(),
        channel: provider === 'paystack' ? 'card' : 'card',
        metadata: {
          escrowId: 'mock_escrow_id'
        }
      },
      provider
    };
  }

  static async refundPayment(reference, amount, provider, reason = 'Test refund') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      data: {
        id: `refund_${Date.now()}`,
        amount: amount,
        status: 'success',
        reference: reference
      },
      provider
    };
  }

  static generatePaymentReference(escrowId, provider) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `MOCK_${provider.toUpperCase()}_${escrowId}_${timestamp}_${random}`;
  }
}

module.exports = MockPaymentService;