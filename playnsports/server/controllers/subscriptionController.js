import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import { getRazorpay } from '../utils/razorpay.js';
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
 * @desc    Create Razorpay order for direct subscription
 * @route   POST /api/subscriptions/order
 * @access  Private
 */
export const createSubscriptionOrderHandler = asyncHandler(async (req, res) => {
  const { planName, price, category = 'general' } = req.body;
  if (!planName || price === undefined || Number(price) <= 0) {
    res.status(400);
    throw new Error('Valid plan name and price are required');
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: Math.round(Number(price) * 100),
    currency: 'INR',
    receipt: `sub_${Date.now()}`,
    notes: {
      userId: req.user._id.toString(),
      planName: String(planName),
      category: String(category),
      type: 'direct_subscription',
    },
  });

  res.json({
    orderId: order.id,
    amount: Number(price),
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    planName,
  });
});

/**
 * @desc    Verify Razorpay payment and activate subscription
 * @route   POST /api/subscriptions/verify
 * @access  Private
 */
export const verifySubscriptionPaymentHandler = asyncHandler(async (req, res) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    groundId,
    category = 'general',
    planName,
    billingCycle = 'monthly',
    price,
    validityDays = 30,
    features = [],
    metadata = {},
  } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    res.status(400);
    throw new Error('Razorpay payment details are required');
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expected !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }

  const startDate = new Date();
  const expiresAt = new Date(startDate.getTime() + Number(validityDays) * 24 * 60 * 60 * 1000);

  const subscription = await createSubscription({
    user: req.user._id,
    ground: groundId || null,
    category,
    planName: (planName || 'Membership').trim(),
    billingCycle,
    price: Number(price) || 0,
    currency: 'INR',
    startDate,
    expiresAt,
    status: 'active',
    payment: {
      razorpayOrderId,
      razorpayPaymentId,
      paymentStatus: 'paid',
    },
    features,
    metadata,
  });

  res.status(201).json({
    success: true,
    message: 'Subscription payment verified and activated successfully ✅',
    subscription,
  });
});

/**
 * @desc    Create a new direct subscription record (admin/internal)
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
  createSubscriptionOrderHandler,
  verifySubscriptionPaymentHandler,
  createSubscriptionHandler,
};
