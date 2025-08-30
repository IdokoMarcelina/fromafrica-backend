
const Product = require('../models/ProductModel');
const Order = require('../models/orderModel');
const User = require('../models/UserModel');
const Escrow = require('../models/EscrowModel');


const getAdminOverview = async (req, res) => {
  try {
   
    const totalProducts = await Product.countDocuments();
    
   
    const totalCustomers = await User.countDocuments({ 
      role: { $in: ['customer', 'buyer'] } 
    });
    

    const totalOrders = await Order.countDocuments();
    
    
    const totalVendors = await User.countDocuments({ 
      role: { $in: ['seller', 'vendor'] } 
    });

    const totalEscrows = await Escrow.countDocuments();
    const activeEscrows = await Escrow.countDocuments({ status: 'funded' });
    const disputedEscrows = await Escrow.countDocuments({ status: 'disputed' });
    
    const escrowValue = await Escrow.aggregate([
      { $match: { status: { $in: ['funded', 'disputed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      message: 'Admin overview fetched successfully',
      data: {
        totalProducts,
        totalCustomers,
        totalOrders,
        totalVendors,
        escrowStats: {
          totalEscrows,
          activeEscrows,
          disputedEscrows,
          totalEscrowValue: escrowValue.length > 0 ? escrowValue[0].total : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch admin overview',
      error: error.message
    });
  }
};


const getSalesOverview = async (req, res) => {
  try {
    const currentDate = new Date();
    const startDate = new Date();
    startDate.setMonth(currentDate.getMonth() - 5); 
    startDate.setDate(1);

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalSales: { 
            $sum: { $multiply: ['$quantity', '$price'] }
          },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

  
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(currentDate.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const monthData = salesData.find(data => 
        data._id.year === year && data._id.month === month
      );
      
      chartData.push({
        month: monthNames[month - 1],
        sales: monthData ? monthData.totalSales : 0,
        orders: monthData ? monthData.orderCount : 0
      });
    }

    res.status(200).json({
      message: 'Sales overview fetched successfully',
      data: chartData,
      summary: {
        totalSales: chartData.reduce((sum, month) => sum + month.sales, 0),
        totalOrders: chartData.reduce((sum, month) => sum + month.orders, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch sales overview',
      error: error.message
    });
  }
};


const getVendorsBuyersData = async (req, res) => {
  try {
    const vendors = await User.countDocuments({ 
      role: { $in: ['seller', 'vendor'] } 
    });
    
    const buyers = await User.countDocuments({ 
      role: { $in: ['customer', 'buyer'] } 
    });

    const total = vendors + buyers;
    
    const data = {
      vendors: {
        count: vendors,
        percentage: total > 0 ? Math.round((vendors / total) * 100) : 0
      },
      buyers: {
        count: buyers,
        percentage: total > 0 ? Math.round((buyers / total) * 100) : 0
      }
    };

    res.status(200).json({
      message: 'Vendors vs buyers data fetched successfully',
      data,
      total
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch vendors vs buyers data',
      error: error.message
    });
  }
};


const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    let query = { role: { $in: ['seller', 'vendor'] } };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const vendors = await User.find(query)
      .select('name email phone status createdAt isVerified')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

   
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const productCount = await Product.countDocuments({ seller: vendor._id });
        const orderCount = await Order.countDocuments({ 
          product: { $in: await Product.find({ seller: vendor._id }).select('_id') }
        });
        
        return {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          status: vendor.status,
          isVerified: vendor.isVerified,
          joinedDate: vendor.createdAt,
          productCount,
          orderCount
        };
      })
    );

    res.status(200).json({
      message: 'Vendors fetched successfully',
      data: vendorsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch vendors',
      error: error.message
    });
  }
};


const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    let query = { role: { $in: ['customer', 'buyer'] } };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const customers = await User.find(query)
      .select('name email phone status createdAt isVerified')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

   
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderCount = await Order.countDocuments({ buyer: customer._id });
        const totalSpent = await Order.aggregate([
          { $match: { buyer: customer._id } },
          { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$price'] } } } }
        ]);
        
        return {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          status: customer.status,
          isVerified: customer.isVerified,
          joinedDate: customer.createdAt,
          orderCount,
          totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
        };
      })
    );

    res.status(200).json({
      message: 'Customers fetched successfully',
      data: customersWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};


const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', search = '' } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    const orders = await Order.find(query)
      .populate('buyer', 'name email')
      .populate('product', 'name seller')
      .populate({
        path: 'product',
        populate: {
          path: 'seller',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      customerName: order.buyer?.name || 'Unknown',
      customerEmail: order.buyer?.email || '',
      productName: order.product?.name || 'Unknown Product',
      vendorName: order.product?.seller?.name || 'Unknown Vendor',
      status: order.status,
      quantity: order.quantity,
      price: order.price,
      totalAmount: order.quantity * order.price,
      orderDate: order.createdAt,
      deliveryDate: order.deliveryDate
    }));

    res.status(200).json({
      message: 'Orders fetched successfully',
      data: formattedOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};


const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('name email status role');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.status(200).json({
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update user status',
      error: error.message
    });
  }
};


const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate('buyer', 'name email')
      .populate('product', 'name');

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    res.status(200).json({
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message
    });
  }
};


const getRecentActivities = async (req, res) => {
  try {
 
    const recentOrders = await Order.find()
      .populate('buyer', 'name')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

  
    const recentUsers = await User.find({ role: { $in: ['seller', 'buyer'] } })
      .sort({ createdAt: -1 })
      .limit(5);

 
    const recentProducts = await Product.find()
      .populate('seller', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const activities = [
      ...recentOrders.map(order => ({
        type: 'order',
        message: `New order #${order._id.toString().slice(-6)} from ${order.buyer?.name || 'Unknown'}`,
        timestamp: order.createdAt,
        data: order
      })),
      ...recentUsers.map(user => ({
        type: 'user_registration',
        message: `New ${user.role} registered: ${user.name}`,
        timestamp: user.createdAt,
        data: user
      })),
      ...recentProducts.map(product => ({
        type: 'product',
        message: `New product listed: ${product.name} by ${product.seller?.name || 'Unknown'}`,
        timestamp: product.createdAt,
        data: product
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

    res.status(200).json({
      message: 'Recent activities fetched successfully',
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
};

const getAllEscrows = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', search = '' } = req.query;
    
    let query = {};
    
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
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Escrow.countDocuments(query);

    const formattedEscrows = escrows.map(escrow => ({
      _id: escrow._id,
      escrowNumber: `ESC-${escrow._id.toString().slice(-6)}`,
      buyerName: escrow.buyer?.name || 'Unknown',
      buyerEmail: escrow.buyer?.email || '',
      sellerName: escrow.seller?.name || 'Unknown',
      productName: escrow.order?.product?.name || 'Unknown Product',
      amount: escrow.amount,
      status: escrow.status,
      createdAt: escrow.createdAt,
      fundedAt: escrow.fundedAt,
      releasedAt: escrow.releasedAt,
      disputeReason: escrow.disputeReason,
      adminNotes: escrow.adminNotes
    }));

    res.status(200).json({
      message: 'Escrows fetched successfully',
      data: formattedEscrows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch escrows',
      error: error.message
    });
  }
};

const getEscrowStatistics = async (req, res) => {
  try {
    const currentDate = new Date();
    const startDate = new Date();
    startDate.setMonth(currentDate.getMonth() - 5); 
    startDate.setDate(1);

    const escrowData = await Escrow.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            status: "$status"
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(currentDate.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const monthEscrows = escrowData.filter(data => 
        data._id.year === year && data._id.month === month
      );
      
      const funded = monthEscrows.find(e => e._id.status === 'funded') || { count: 0, totalAmount: 0 };
      const disputed = monthEscrows.find(e => e._id.status === 'disputed') || { count: 0, totalAmount: 0 };
      const released = monthEscrows.find(e => e._id.status === 'released') || { count: 0, totalAmount: 0 };
      
      chartData.push({
        month: monthNames[month - 1],
        funded: funded.count,
        disputed: disputed.count,
        released: released.count,
        totalAmount: funded.totalAmount + disputed.totalAmount + released.totalAmount
      });
    }

    res.status(200).json({
      message: 'Escrow statistics fetched successfully',
      data: chartData
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch escrow statistics',
      error: error.message
    });
  }
};

const getDisputedEscrows = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const escrows = await Escrow.find({ status: 'disputed' })
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
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

    const total = await Escrow.countDocuments({ status: 'disputed' });

    const formattedDisputes = escrows.map(escrow => ({
      _id: escrow._id,
      escrowNumber: `ESC-${escrow._id.toString().slice(-6)}`,
      buyer: {
        name: escrow.buyer?.name || 'Unknown',
        email: escrow.buyer?.email || '',
        phone: escrow.buyer?.phone || ''
      },
      seller: {
        name: escrow.seller?.name || 'Unknown', 
        email: escrow.seller?.email || '',
        phone: escrow.seller?.phone || ''
      },
      product: {
        name: escrow.order?.product?.name || 'Unknown Product',
        price: escrow.order?.product?.price || 0
      },
      amount: escrow.amount,
      disputeReason: escrow.disputeReason,
      createdAt: escrow.createdAt,
      transactionHistory: escrow.transactionHistory
    }));

    res.status(200).json({
      message: 'Disputed escrows fetched successfully',
      data: formattedDisputes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch disputed escrows',
      error: error.message
    });
  }
};

module.exports = {
  getAdminOverview,
  getSalesOverview,
  getVendorsBuyersData,
  getAllVendors,
  getAllCustomers,
  getAllOrders,
  updateUserStatus,
  updateOrderStatus,
  getRecentActivities,
  getAllEscrows,
  getEscrowStatistics,
  getDisputedEscrows
};