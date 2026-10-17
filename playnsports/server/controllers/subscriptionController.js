import asyncHandler from 'express-async-handler';
import {
  getMySubscriptions,
  getSubscriptionById,
  createSubscription,
} from '../services/subscriptionService.js';

/**
 * @desc    Get all subscriptions & memberships for the logged-in user
 * @route   GET /api/subscriptions/my (or GET /api/subscriptions/my-subscriptions)
 * @access  Private (Authenticated users)
 */
export const getMySubscriptionsHandler = asyncHandler(async (req, res) => {
  const result = await getMySubscriptions(req.user._id);
  res.json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Get details of a single subscription/membership
 * @route   GET /api/subscriptions/:id
 * @access  Private (Authenticated users)
 */
export const getSubscriptionByIdHandler = asyncHandler(async (req, res) => {
  const subscription = await getSubscriptionById(req.user._id, req.params.id);
  if (!subscription) {
    res.status(404);
    throw new Error('Subscription or membership not found');
  }

  res.json({
    success: true,
    subscription,
  });
});

/**
 * @desc    Create a new subscription record
 * @route   POST /api/subscriptions
 * @access  Private
 */
export const createSubscriptionHandler = asyncHandler(async (req, res) => {
  const {
    groundId,
    category = 'general',
    planName,
    billingCycle = 'monthly',
    price,
    validityDays = 30,
    features = [],
    metadata = {},
  } = req.body;

  if (!planName) {
    res.status(400);
    throw new Error('Plan name is required');
  }

  if (price === undefined || Number(price) < 0) {
    res.status(400);
    throw new Error('A valid price is required');
  }

  const startDate = new Date();
  const expiresAt = new Date(startDate.getTime() + Number(validityDays) * 24 * 60 * 60 * 1000);

  const subscription = await createSubscription({
    user: req.user._id,
    ground: groundId || null,
    category,
    planName: planName.trim(),
    billingCycle,
    price: Number(price),
    currency: 'INR',
    startDate,
    expiresAt,
    status: 'active',
    features,
    metadata,
  });

  res.status(201).json({
    success: true,
    message: 'Subscription created successfully ✅',
    subscription,
  });
});

export default {
  getMySubscriptionsHandler,
  getSubscriptionByIdHandler,
  createSubscriptionHandler,
};
