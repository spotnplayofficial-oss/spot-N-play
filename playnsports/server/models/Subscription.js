import mongoose from 'mongoose';

// Unified Subscription model for SpotNPlay.
// Supports standalone arena passes, pool memberships, club passes, and general sports subscriptions.
const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ground: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ground',
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: ['arena_membership', 'pool_membership', 'gym_membership', 'club_membership', 'general'],
      default: 'general',
      index: true,
    },
    planName: {
      type: String,
      required: true,
      trim: true,
    },
    billingCycle: {
      type: String,
      enum: ['daily', 'monthly', 'quarterly', 'semester', 'annual', 'session_package', 'custom'],
      default: 'monthly',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'active',
      index: true,
    },
    payment: {
      razorpayOrderId: { type: String, default: '' },
      razorpayPaymentId: { type: String, default: '' },
      paymentStatus: { type: String, default: 'paid' },
    },
    features: [{ type: String }],
    autoRenew: {
      type: Boolean,
      default: false,
    },
    ticketId: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ user: 1, ground: 1, status: 1 });
subscriptionSchema.index({ user: 1, expiresAt: -1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
