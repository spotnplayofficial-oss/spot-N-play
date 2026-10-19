import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getMySubscriptionsHandler,
  getSubscriptionByIdHandler,
  verifyPassHandler,
  createSubscriptionHandler,
  createSubscriptionOrderHandler,
  verifySubscriptionPaymentHandler,
} from '../controllers/subscriptionController.js';

const router = express.Router();

// ── Public Gate-Pass Verification (for QR Code scanning by vendors) ──
router.get('/verify-pass/:id', verifyPassHandler);

// ── User Subscriptions & Memberships ─────────────────────────────────
// Get all subscriptions and memberships for the authenticated user
router.get('/my', protect, getMySubscriptionsHandler);
router.get('/my-subscriptions', protect, getMySubscriptionsHandler);

// Razorpay order creation & payment verification
router.post('/order', protect, createSubscriptionOrderHandler);
router.post('/verify', protect, verifySubscriptionPaymentHandler);

// Create a new direct subscription (manual / internal)
router.post('/', protect, createSubscriptionHandler);

// Get single subscription details
router.get('/:id', protect, getSubscriptionByIdHandler);

export default router;
