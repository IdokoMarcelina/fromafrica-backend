const Product = require('../models/ProductModel');
const Order = require('../models/orderModel');
const User = require('../models/UserModel');

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

// Get statistics data for the bar chart (orders and completed orders by month)
const getStatisticsChartData = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const sellerProducts = await Product.find({ seller: sellerId }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    // Get data for the last 12 months
    const months = [];
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }

    const statisticsData = await Promise.all(
      months.map(async ({ year, month, label }) => {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        // Get total orders for this month
        const totalOrders = await Order.countDocuments({
          product: { $in: productIds },
          createdAt: { $gte: startDate, $lte: endDate }
        });

        // Get completed orders for this month (delivered status)
        const completedOrders = await Order.countDocuments({
          product: { $in: productIds },
          status: 'delivered',
          createdAt: { $gte: startDate, $lte: endDate }
        });

        return {
          period: label,
          orders: totalOrders,
          completed: completedOrders
        };
      })
    );

    res.status(200).json({
      message: 'Statistics data fetched successfully',
      data: statisticsData
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch statistics data',
      error: error.message
    });
  }
};

// Get audience by region data for the world map
const getAudienceByRegion = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const sellerProducts = await Product.find({ seller: sellerId }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    // Get orders with buyer information
    const orders = await Order.find({ product: { $in: productIds } })
      .populate({
        path: 'buyer',
        select: 'address sellerDetails.country sellerDetails.state'
      });

    // Group customers by region (country)
    const regionData = {};
    const processedCustomers = new Set();

    orders.forEach(order => {
      if (order.buyer && !processedCustomers.has(order.buyer._id.toString())) {
        processedCustomers.add(order.buyer._id.toString());
        
        // Extract country from seller details or address
        let country = 'Unknown';
        if (order.buyer.sellerDetails?.country) {
          country = order.buyer.sellerDetails.country;
        } else if (order.buyer.address) {
          // Try to extract country from address string
          // This is a simple extraction - you might want to use a more sophisticated method
          const addressParts = order.buyer.address.split(',');
          if (addressParts.length > 0) {
            country = addressParts[addressParts.length - 1].trim();
          }
        }

        if (regionData[country]) {
          regionData[country]++;
        } else {
          regionData[country] = 1;
        }
      }
    });

    // Convert to array format for frontend
    const audienceData = Object.entries(regionData).map(([country, count]) => ({
      country,
      customers: count,
      percentage: ((count / processedCustomers.size) * 100).toFixed(1)
    }));

    // Sort by customer count descending
    audienceData.sort((a, b) => b.customers - a.customers);

    res.status(200).json({
      message: 'Audience by region data fetched successfully',
      data: audienceData,
      totalCustomers: processedCustomers.size
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch audience by region data',
      error: error.message
    });
  }
};

// Get top products data
const getTopProducts = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const sellerProducts = await Product.find({ seller: sellerId }).select('_id name price');
    const productIds = sellerProducts.map(p => p._id);

    // Get order counts for each product
    const productSales = await Order.aggregate([
      { $match: { product: { $in: productIds } } },
      { 
        $group: {
          _id: '$product',
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 5 }
    ]);

    // Populate with product details
    const topProducts = await Promise.all(
      productSales.map(async (sale) => {
        const product = sellerProducts.find(p => p._id.toString() === sale._id.toString());
        return {
          productId: sale._id,
          name: product?.name || 'Unknown Product',
          price: product?.price || 0,
          totalOrders: sale.totalOrders,
          totalQuantity: sale.totalQuantity,
          totalRevenue: sale.totalRevenue
        };
      })
    );

    res.status(200).json({
      message: 'Top products fetched successfully',
      data: topProducts
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch top products',
      error: error.message
    });
  }
};

// Get upcoming/recent orders
const getUpcomingOrders = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const sellerProducts = await Product.find({ seller: sellerId }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    const orders = await Order.find({ product: { $in: productIds } })
      .populate({
        path: 'product',
        select: 'name price'
      })
      .populate({
        path: 'buyer',
        select: 'name email'
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const ordersData = orders.map(order => ({
      orderId: order._id,
      productName: order.product?.name || 'Unknown Product',
      buyerName: order.buyer?.name || 'Unknown Customer',
      buyerEmail: order.buyer?.email || '',
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      status: order.status,
      paymentStatus: order.paymentStatus,
      orderDate: order.createdAt,
      deliveryAddress: order.deliveryAddress
    }));

    res.status(200).json({
      message: 'Upcoming orders fetched successfully',
      data: ordersData
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch upcoming orders',
      error: error.message
    });
  }
};

module.exports = {
  getTotalProducts,
  getTotalOrders,
  getTotalCustomers,
  getTotalImpressions,
  getStatisticsChartData,
  getAudienceByRegion,
  getTopProducts,
  getUpcomingOrders
};
