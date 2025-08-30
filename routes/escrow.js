const express = require('express');
const router = express.Router();
const { 
  createEscrow,
  initializeEscrowPayment,
  verifyEscrowPayment,
  releaseEscrow,
  disputeEscrow,
  refundEscrow,
  getEscrowDetails,
  getUserEscrows,
  adminInterventionEscrow
} = require('../controllers/escrowController');
const authMiddleware = require('../middlewares/authmiddleware');
const isAdmin = require('../middlewares/isAdmin');

router.post('/create', authMiddleware, createEscrow);
router.post('/:escrowId/initialize-payment', authMiddleware, initializeEscrowPayment);
router.post('/:escrowId/verify-payment', authMiddleware, verifyEscrowPayment);
router.put('/:escrowId/release', authMiddleware, releaseEscrow);
router.put('/:escrowId/dispute', authMiddleware, disputeEscrow);
router.put('/:escrowId/refund', authMiddleware, isAdmin, refundEscrow);
router.get('/:escrowId', authMiddleware, getEscrowDetails);
router.get('/user/list', authMiddleware, getUserEscrows);
router.put('/:escrowId/admin-intervention', authMiddleware, isAdmin, adminInterventionEscrow);

module.exports = router;