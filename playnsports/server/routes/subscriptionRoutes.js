import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getMySubscriptionsHandler,
  getSubscriptionByIdHandler,
  createSubscriptionHandler,
} from '../controllers/subscriptionController.js';

const router = express.Router();

// ── User Subscriptions & Memberships ─────────────────────────────────
// Get all subscriptions and memberships for the authenticated user
router.get('/my', protect, getMySubscriptionsHandler);
router.get('/my-subscriptions', protect, getMySubscriptionsHandler);

// Create a new direct subscription
router.post('/', protect, createSubscriptionHandler);

// Get single subscription details
router.get('/:id', protect, getSubscriptionByIdHandler);

export default router;
