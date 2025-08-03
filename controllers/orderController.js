const Order = require('../models/orderModel');

 const getOrderStats = async (req, res) => {
  try {
    const sellerId = req.user._id;

    const sellerProducts = await Product.find({ seller: sellerId }).select('_id');
    const productIds = sellerProducts.map(p => p._id);

    const stats = await Order.aggregate([
      { $match: { product: { $in: productIds } } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ message: "Order statistics", data: stats });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get order stats', error: err.message });
  }
};

module.exports = getOrderStats;