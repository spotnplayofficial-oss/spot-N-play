import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import FitTransaction from '../models/FitTransaction.js';
import {
  ensureReferralCode, creditUser, getEconomy,
  INVITE_SIGNUP_FITPOINTS, INVITE_FIRSTBOOKING_FITPOINTS,
} from '../services/fitService.js';
import { getRazorpay } from '../utils/razorpay.js';

// GET /api/users/fit/wallet — balances, invite stats, recent history
const getMyWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  await ensureReferralCode(user);
  res.json(await getEconomy(req.user._id));
});

// POST /api/users/fit/apply-referral { code } — one shot, self-only
const applyReferral = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400);
    throw new Error('Enter an invite code');
  }
  const user = await User.findById(req.user._id);
  if (user.referredBy) {
    res.status(400);
    throw new Error('You have already used an invite code');
  }
  const inviter = await User.findOne({ referralCode: code });
  if (!inviter) {
    res.status(404);
    throw new Error('Invalid invite code');
  }
  if (String(inviter._id) === String(user._id)) {
    res.status(400);
    throw new Error("You can't use your own code");
  }
  user.referredBy = inviter._id;
  await user.save();

  // Welcome bonus to the new player: user gets Fit Points only (not Fitcoin)
  await creditUser({
    userId: user._id,
    type: 'earn_welcome',
    fitcoin: 0,
    fitPoints: INVITE_SIGNUP_FITPOINTS,
    relatedUser: inviter._id,
    note: 'Welcome bonus for using an invite code',
  });
  await FitTransaction.create({
    user: inviter._id,
    type: 'earn_invite_signup',
    fitcoin: 0,
    fitPoints: 0,
    relatedUser: user._id,
    note: `${user.name} joined with your code`,
  });

  res.json({
    message: `Welcome bonus ${INVITE_SIGNUP_FITPOINTS} Fit Points added 🎉`,
    invitedBy: { _id: inviter._id, name: inviter.name },
    ...(await getEconomy(user._id)),
  });
});

// GET /api/users/fit/invite — code, share link, invited friends + earnings
const getInviteInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const code = await ensureReferralCode(user);
  const invited = await User.find({ referredBy: req.user._id })
    .select('name avatar createdAt totalEarnedFitPoints')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const rewarded = await User.countDocuments({ referredBy: req.user._id, referralRewardGiven: true });
  const earned = await FitTransaction.aggregate([
    { $match: { user: req.user._id, type: { $in: ['earn_invite_booking'] } } },
    { $group: { _id: null, fitPoints: { $sum: '$fitPoints' }, count: { $sum: 1 } } },
  ]);
  // The link a friend taps: must be the REAL signup route (/register —
  // there is no /signup route) on the configured frontend origin.
  const origin = (process.env.CLIENT_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const inviteLink = `${origin}/register?ref=${code}`;
  res.json({
    referralCode: code,
    inviteLink,
    rules: {
      signupBonus: INVITE_SIGNUP_FITPOINTS,
      firstBookingBonus: INVITE_FIRSTBOOKING_FITPOINTS,
    },
    invitedCount: invited.length,
    rewardedCount: rewarded,
    earnedFitPoints: earned[0]?.fitPoints || 0,
    invited: invited.map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar || '',
      joinedAt: u.createdAt,
    })),
  });
});

// POST /api/users/fit/create-order — Buy Fitcoins with real money (1 fitcoin = 1 rupee)
const createFitcoinOrder = asyncHandler(async (req, res) => {
  const amount = Math.round(Number(req.body.amount) || 0);
  if (amount < 10) {
    res.status(400);
    throw new Error('Minimum purchase is ₹10 (10 Fitcoins)');
  }

  // 1 Fitcoin = 1 Rupee
  const fitcoins = amount;

  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount: amount * 100, // in paise
        currency: 'INR',
        receipt: `fc_${Date.now()}_${req.user._id.toString().slice(-4)}`,
        notes: {
          userId: req.user._id.toString(),
          type: 'buy_fitcoin',
          fitcoins: String(fitcoins),
        },
      });

      return res.json({
        orderId: order.id,
        amount,
        fitcoins,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      console.error('Razorpay order creation error for Fitcoin purchase:', err);
    }
  }

  // Fallback for development / test environments without active Razorpay keys
  res.json({
    orderId: `test_fc_order_${Date.now()}`,
    amount,
    fitcoins,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_spotnplay',
    isTest: true,
  });
});

// POST /api/users/fit/verify-payment — verify real money purchase and credit Fitcoins
const verifyFitcoinPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = req.body;
  const numAmount = Math.round(Number(amount) || 0);

  if (numAmount <= 0) {
    res.status(400);
    throw new Error('Invalid purchase amount');
  }

  // Verify HMAC signature if live Razorpay keys are configured
  if (process.env.RAZORPAY_KEY_SECRET && razorpaySignature && !razorpayOrderId?.startsWith('test_')) {
    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generated !== razorpaySignature) {
      res.status(400);
      throw new Error('Payment verification failed. Invalid signature.');
    }
  }

  // 1 Fitcoin = 1 Rupee: user gets Fitcoins directly into their wallet
  await User.updateOne(
    { _id: req.user._id },
    { $inc: { fitcoin: numAmount, totalEarnedFitcoin: numAmount } }
  );

  await FitTransaction.create({
    user: req.user._id,
    type: 'buy_fitcoin',
    fitcoin: numAmount,
    fitPoints: 0,
    amountPaid: numAmount,
    note: `Direct purchase of ${numAmount} Fitcoins (1 ₹ = 1 FC)`,
  });

  const updatedEconomy = await getEconomy(req.user._id);

  res.json({
    success: true,
    message: `Successfully purchased ${numAmount} Fitcoins! 🪙`,
    fitcoinsAdded: numAmount,
    ...updatedEconomy,
  });
});

export {
  getMyWallet,
  applyReferral,
  getInviteInfo,
  createFitcoinOrder,
  verifyFitcoinPayment,
};
