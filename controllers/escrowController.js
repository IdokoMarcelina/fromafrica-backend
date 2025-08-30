const Escrow = require('../models/EscrowModel');
const Order = require('../models/orderModel');
const User = require('../models/UserModel');
const Product = require('../models/ProductModel');
const PaymentService = require('../services/paymentService');

const createEscrow = async (req, res) => {
  try {
    const { orderId } = req.body;
    const buyerId = req.user._id;

    const order = await Order.findById(orderId).populate('product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyer.toString() !== buyerId.toString()) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    if (order.paymentStatus === 'escrowed') {
      return res.status(400).json({ message: 'Order already has escrow' });
    }

    const autoReleaseDate = new Date();
    autoReleaseDate.setDate(autoReleaseDate.getDate() + 7);

    const escrow = new Escrow({
      order: orderId,
      buyer: buyerId,
      seller: order.product.seller,
      amount: order.totalPrice,
      releaseConditions: {
        autoReleaseDate
      },
      transactionHistory: [{
        action: 'created',
        performedBy: buyerId,
        notes: 'Escrow created for order'
      }]
    });

    await escrow.save();

    order.escrow = escrow._id;
    order.paymentStatus = 'escrowed';
    await order.save();

    res.status(201).json({
      message: 'Escrow created successfully',
      data: escrow
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create escrow',
      error: error.message
    });
  }
};

const initializeEscrowPayment = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { provider = 'paystack', phoneNumber } = req.body;
    const buyerId = req.user._id;

    const escrow = await Escrow.findById(escrowId).populate('buyer order');
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.buyer._id.toString() !== buyerId.toString()) {
      return res.status(403).json({ message: 'Not authorized for this escrow' });
    }

    if (escrow.status !== 'pending') {
      return res.status(400).json({ message: 'Payment already initialized for this escrow' });
    }

    if (!['paystack', 'flutterwave'].includes(provider)) {
      return res.status(400).json({ message: 'Invalid payment provider' });
    }

    const paymentData = {
      email: escrow.buyer.email,
      amount: escrow.amount,
      escrowId: escrow._id,
      orderId: escrow.order._id,
      phoneNumber,
      name: escrow.buyer.name,
      metadata: {
        escrowId: escrow._id.toString(),
        orderId: escrow.order._id.toString(),
        buyerId: buyerId.toString()
      }
    };

    const paymentResult = await PaymentService.initializePayment(paymentData, provider);

    if (!paymentResult.success) {
      return res.status(400).json({
        message: 'Payment initialization failed',
        error: paymentResult.error
      });
    }

    escrow.paymentDetails = {
      provider,
      reference: paymentResult.data.reference || paymentData.reference,
      accessCode: paymentResult.data.access_code,
      authorizationUrl: paymentResult.data.authorization_url
    };

    escrow.transactionHistory.push({
      action: 'payment_initialized',
      performedBy: buyerId,
      notes: `Payment initialized with ${provider} - Reference: ${escrow.paymentDetails.reference}`
    });

    await escrow.save();

    res.status(200).json({
      message: 'Payment initialized successfully',
      data: {
        provider,
        authorizationUrl: paymentResult.data.authorization_url,
        reference: escrow.paymentDetails.reference,
        accessCode: escrow.paymentDetails.accessCode
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

const verifyEscrowPayment = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { transactionId } = req.body;
    const buyerId = req.user._id;

    const escrow = await Escrow.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.buyer.toString() !== buyerId.toString()) {
      return res.status(403).json({ message: 'Not authorized for this escrow' });
    }

    if (escrow.status === 'funded') {
      return res.status(400).json({ message: 'Escrow already funded' });
    }

    if (!escrow.paymentDetails.provider || !escrow.paymentDetails.reference) {
      return res.status(400).json({ message: 'Payment not initialized' });
    }

    const verificationResult = await PaymentService.verifyPayment(
      escrow.paymentDetails.reference,
      escrow.paymentDetails.provider,
      transactionId,
      escrow.amount // Pass expected amount for mock service
    );

    if (!verificationResult.success) {
      return res.status(400).json({
        message: 'Payment verification failed',
        error: verificationResult.error
      });
    }

    if (verificationResult.data.amount !== escrow.amount) {
      return res.status(400).json({
        message: 'Payment amount mismatch'
      });
    }

    escrow.status = 'funded';
    escrow.fundedAt = new Date();
    escrow.paymentDetails.transactionId = transactionId;
    escrow.paymentDetails.channel = verificationResult.data.channel;
    escrow.paymentDetails.gatewayResponse = verificationResult.data.gateway_response;
    
    escrow.transactionHistory.push({
      action: 'payment_verified',
      performedBy: buyerId,
      notes: `Payment verified - ${verificationResult.data.channel} - ${verificationResult.data.gateway_response}`
    });

    escrow.transactionHistory.push({
      action: 'funded',
      performedBy: buyerId,
      notes: `Escrow funded via ${escrow.paymentDetails.provider} - Amount: ${escrow.amount}`
    });

    await escrow.save();

    res.status(200).json({
      message: 'Payment verified and escrow funded successfully',
      data: {
        escrow,
        paymentDetails: verificationResult.data
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

const releaseEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { releaseNotes } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const escrow = await Escrow.findById(escrowId).populate('order buyer seller');
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.status !== 'funded') {
      return res.status(400).json({ message: 'Escrow must be funded before release' });
    }

    const isBuyer = escrow.buyer._id.toString() === userId.toString();
    const isAdmin = userRole === 'admin';

    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ message: 'Only buyer or admin can release escrow' });
    }

    escrow.status = 'released';
    escrow.releasedAt = new Date();
    escrow.transactionHistory.push({
      action: 'released',
      performedBy: userId,
      notes: releaseNotes || `Escrow released by ${isAdmin ? 'admin' : 'buyer'}`
    });

    await escrow.save();

    const order = await Order.findById(escrow.order);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
    }

    res.status(200).json({
      message: 'Escrow released successfully',
      data: escrow
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to release escrow',
      error: error.message
    });
  }
};

const disputeEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const escrow = await Escrow.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    const isBuyer = escrow.buyer.toString() === userId.toString();
    const isSeller = escrow.seller.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Only buyer or seller can dispute escrow' });
    }

    if (escrow.status !== 'funded') {
      return res.status(400).json({ message: 'Can only dispute funded escrow' });
    }

    escrow.status = 'disputed';
    escrow.disputeReason = reason;
    escrow.transactionHistory.push({
      action: 'disputed',
      performedBy: userId,
      notes: `Dispute raised: ${reason}`
    });

    await escrow.save();

    res.status(200).json({
      message: 'Escrow dispute created successfully',
      data: escrow
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create dispute',
      error: error.message
    });
  }
};

const refundEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { refundNotes, processRefund = true } = req.body;
    const adminId = req.user._id;

    const escrow = await Escrow.findById(escrowId).populate('order');
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.status !== 'funded' && escrow.status !== 'disputed') {
      return res.status(400).json({ message: 'Escrow cannot be refunded in current status' });
    }

    let refundResult = null;
    
    if (processRefund && escrow.paymentDetails.provider && escrow.paymentDetails.reference) {
      refundResult = await PaymentService.refundPayment(
        escrow.paymentDetails.reference,
        escrow.amount,
        escrow.paymentDetails.provider,
        refundNotes || 'Escrow refund'
      );

      if (!refundResult.success) {
        return res.status(400).json({
          message: 'Payment refund failed',
          error: refundResult.error
        });
      }
    }

    escrow.status = 'refunded';
    escrow.adminNotes = refundNotes;
    escrow.transactionHistory.push({
      action: 'refunded',
      performedBy: adminId,
      notes: `${refundNotes || 'Escrow refunded by admin'}${refundResult ? ` - Gateway refund: ${refundResult.success}` : ''}`
    });

    await escrow.save();

    const order = await Order.findById(escrow.order);
    if (order) {
      order.paymentStatus = 'unpaid';
      order.status = 'cancelled';
      await order.save();
    }

    res.status(200).json({
      message: 'Escrow refunded successfully',
      data: {
        escrow,
        refundDetails: refundResult
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to refund escrow',
      error: error.message
    });
  }
};

const getEscrowDetails = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const escrow = await Escrow.findById(escrowId)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate({
        path: 'order',
        populate: {
          path: 'product',
          select: 'name price'
        }
      })
      .populate('transactionHistory.performedBy', 'name role');

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    const isBuyer = escrow.buyer._id.toString() === userId.toString();
    const isSeller = escrow.seller._id.toString() === userId.toString();
    const isAdmin = userRole === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this escrow' });
    }

    res.status(200).json({
      message: 'Escrow details fetched successfully',
      data: escrow
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch escrow details',
      error: error.message
    });
  }
};

const getUserEscrows = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = {
      $or: [
        { buyer: userId },
        { seller: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const escrows = await Escrow.find(query)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate({
        path: 'order',
        populate: {
          path: 'product',
          select: 'name price'
        }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Escrow.countDocuments(query);

    res.status(200).json({
      message: 'User escrows fetched successfully',
      data: escrows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch user escrows',
      error: error.message
    });
  }
};

const adminInterventionEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { action, notes } = req.body;
    const adminId = req.user._id;

    const escrow = await Escrow.findById(escrowId).populate('order');
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (!['release', 'refund'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use release or refund' });
    }

    if (action === 'release') {
      escrow.status = 'released';
      escrow.releasedAt = new Date();
      
      const order = await Order.findById(escrow.order);
      if (order) {
        order.paymentStatus = 'paid';
        await order.save();
      }
    } else if (action === 'refund') {
      escrow.status = 'refunded';
      
      const order = await Order.findById(escrow.order);
      if (order) {
        order.paymentStatus = 'unpaid';
        order.status = 'cancelled';
        await order.save();
      }
    }

    escrow.adminNotes = notes;
    escrow.transactionHistory.push({
      action: 'admin_intervention',
      performedBy: adminId,
      notes: `Admin ${action}: ${notes}`
    });

    await escrow.save();

    res.status(200).json({
      message: `Escrow ${action} completed by admin`,
      data: escrow
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to perform admin intervention',
      error: error.message
    });
  }
};

module.exports = {
  createEscrow,
  initializeEscrowPayment,
  verifyEscrowPayment,
  releaseEscrow,
  disputeEscrow,
  refundEscrow,
  getEscrowDetails,
  getUserEscrows,
  adminInterventionEscrow
};