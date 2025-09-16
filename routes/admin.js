
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
  getRecentActivities,
  getAllEscrows,
  getEscrowStatistics,
  getDisputedEscrows,
  updatePassword,
  updateNotifications,
  approveBusiness
} = require('../controllers/adminController');
const isAdmin = require('../middlewares/isAdmin');
const authenticateUser = require('../middlewares/authmiddleware');



router.get('/overview', authenticateUser, isAdmin, getAdminOverview);
router.get('/sales-overview',authenticateUser, isAdmin, getSalesOverview);
router.get('/vendors-buyers-data',authenticateUser, isAdmin, getVendorsBuyersData);
router.get('/recent-activities',authenticateUser, isAdmin, getRecentActivities);


router.put("/update-password",authenticateUser, isAdmin, updatePassword);
router.put("/update-notifications",authenticateUser, isAdmin, updateNotifications);
router.put('/approve-business/:id',authenticateUser, isAdmin, approveBusiness);

router.get('/vendors',authenticateUser, isAdmin, getAllVendors);
router.get('/customers',authenticateUser, isAdmin, getAllCustomers);
router.put('/users/:userId/status',authenticateUser, isAdmin, updateUserStatus);


router.get('/orders', isAdmin, getAllOrders);
router.put('/orders/:orderId/status',authenticateUser, isAdmin, updateOrderStatus);

router.get('/escrows', authenticateUser, isAdmin, getAllEscrows);
router.get('/escrow-statistics', authenticateUser, isAdmin, getEscrowStatistics);
router.get('/disputed-escrows', authenticateUser, isAdmin, getDisputedEscrows);

module.exports = router