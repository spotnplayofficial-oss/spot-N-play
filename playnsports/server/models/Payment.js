import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ground: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ground',
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    advanceAmount: {
      type: Number,
      required: true,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    // Snapshot of the venue's commission split at the moment this order was
    // created — never recalculated later, so changing a venue's commission
    // going forward doesn't alter historical payouts.
    commissionPercent: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    ownerPayout: { type: Number, default: 0 },
    advancePayment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
      },
      paidAt: Date,
    },
    finalPayment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'not_due'],
        default: 'not_due',
      },
      paidAt: Date,
    },
    refund: {
      razorpayRefundId: String,
      amount: Number,
      status: {
        type: String,
        enum: ['none', 'initiated', 'processed'],
        default: 'none',
      },
      processedAt: Date,
    },
    status: {
      type: String,
      enum: ['advance_pending', 'advance_paid', 'final_pending', 'completed', 'refunded', 'cancelled'],
      default: 'advance_pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);