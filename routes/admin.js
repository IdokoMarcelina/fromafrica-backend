
const express = require('express');
const router = express.Router();
const {
  getAdminOverview,
  getSalesOverview,
  getVendorsBuyersData,
  getAllVendors,
  getAllCustomers,
  getAllOrders,
  updateUserStatus,
  updateOrderStatus,
  getRecentActivities
} = require('../controllers/adminController');


const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      message: 'Access denied. Admin privileges required.'
    });
  }
};


router.get('/overview', isAdmin, getAdminOverview);
router.get('/sales-overview', isAdmin, getSalesOverview);
router.get('/vendors-buyers-data', isAdmin, getVendorsBuyersData);
router.get('/recent-activities', isAdmin, getRecentActivities);


router.get('/vendors', isAdmin, getAllVendors);
router.get('/customers', isAdmin, getAllCustomers);
router.put('/users/:userId/status', isAdmin, updateUserStatus);


router.get('/orders', isAdmin, getAllOrders);
router.put('/orders/:orderId/status', isAdmin, updateOrderStatus);

module.exports = router;