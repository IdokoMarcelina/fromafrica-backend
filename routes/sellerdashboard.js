const express = require('express');
const router = express.Router();
const authenticateUser = require('../middlewares/authmiddleware');
const isSeller = require('../middlewares/isSeller');
const { getTotalProducts, getTotalOrders, getTotalCustomers, getTotalImpressions } = require('../controllers/sellerDashboard');


router.get('/total-products', authenticateUser, isSeller, getTotalProducts);
router.get('/total-orders', authenticateUser, isSeller, getTotalOrders);
router.get('/total-customers', authenticateUser, isSeller, getTotalCustomers);
router.get('/total-impressions', authenticateUser, isSeller, getTotalImpressions);

module.exports = router;
