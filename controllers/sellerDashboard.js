const Product = require('../models/ProductModel');
const Order = require('../models/orderModel');

// 1. Total Products
const getTotalProducts = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const totalProducts = await Product.countDocuments({ seller: sellerId });

    res.status(200).json({
      message: 'Total products fetched successfully',
      totalProducts
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch total products',
      error: error.message
    });
  }
};

// 2. Total Orders
const getTotalOrders = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const sellerProducts = await Product.find({ seller: sellerId }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    const totalOrders = await Order.countDocuments({ product: { $in: productIds } });

    res.status(200).json({
      message: 'Total orders fetched successfully',
      totalOrders
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch total orders',
      error: error.message
    });
  }
};

// 3. Total Customers
const getTotalCustomers = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const sellerProducts = await Product.find({ seller: sellerId }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    const customerIds = await Order.distinct('buyer', { product: { $in: productIds } });

    res.status(200).json({
      message: 'Total customers fetched successfully',
      totalCustomers: customerIds.length
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch total customers',
      error: error.message
    });
  }
};

// 4. Total Impressions
const getTotalImpressions = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const products = await Product.find({ seller: sellerId });

    const totalImpressions = products.reduce((sum, product) => {
      return sum + (product.impressions || 0);
    }, 0);

    res.status(200).json({
      message: 'Total impressions fetched successfully',
      totalImpressions
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch total impressions',
      error: error.message
    });
  }
};

module.exports = {
  getTotalProducts,
  getTotalOrders,
  getTotalCustomers,
  getTotalImpressions
};
