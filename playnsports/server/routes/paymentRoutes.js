import express from 'express';
import {
  createAdvanceOrder,
  verifyAdvancePayment,
  createFinalOrder,
  verifyFinalPayment,
  cancelAndRefund,
  getMyPayments,
  createEventOrder,
  verifyEventPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ── Ground booking payments ──────────────────────────────────
router.post('/grounds/:id/advance-order', protect, authorizeRoles('player'), createAdvanceOrder);
router.post('/grounds/:id/verify-advance', protect, authorizeRoles('player'), verifyAdvancePayment);
router.post('/bookings/:id/final-order', protect, authorizeRoles('player'), createFinalOrder);
router.post('/bookings/:id/verify-final', protect, authorizeRoles('player'), verifyFinalPayment);
router.post('/bookings/:id/cancel-refund', protect, authorizeRoles('player'), cancelAndRefund);
router.get('/my', protect, authorizeRoles('player'), getMyPayments);

// ── Event payments ───────────────────────────────────────────
router.post('/events/:id/order', protect, createEventOrder);
router.post('/events/:id/verify', protect, verifyEventPayment);

export default router;