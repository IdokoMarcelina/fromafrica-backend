const express = require('express');
const router = express.Router();

const { setSubscriptionFee, createWaiver, applyWaiver } = require('../controllers/subscriptionController');
const isAdmin = require('../middlewares/isAdmin');
const authenticateUser = require('../middlewares/authmiddleware');

router.post('/admin/set-fee',authenticateUser, isAdmin, setSubscriptionFee);

router.post('/admin/create-waiver',authenticateUser, isAdmin, createWaiver);

router.post('/use-waiver', authenticateUser, applyWaiver);

module.exports = router;
