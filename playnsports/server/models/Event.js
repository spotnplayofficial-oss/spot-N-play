import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    paymentStatus: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    amountPaid: { type: Number, default: 0 },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },

    // ── Ticket / check-in ──
    ticketId: { type: String, default: '' }, // e.g. "SPT-4F7K2Q9X"
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    ticketEmailSent: { type: Boolean, default: false },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please add an event title'],
      trim: true,
    },
    sport: {
      type: String,
      enum: ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'box cricket', 'box football', 'other'],
      required: true,
    },
    description: { type: String, trim: true, default: '' },

    // ── type & pricing ──
    eventType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    price: { type: Number, default: 0 },

    // ── contact info (shown to interested users) ──
    contactName: { type: String, trim: true, default: '' },
    contactNumber: {
      type: String,
      required: [true, 'Please add a contact number'],
      trim: true,
    },

    // ── where & when ──
    venue: {
      type: String,
      required: [true, 'Please add a venue / location'],
      trim: true,
    },
    date: { type: String, required: true },       // 'YYYY-MM-DD'
    startTime: { type: String, required: true },  // 'HH:mm'
    endTime: { type: String, required: true },    // 'HH:mm'

    maxParticipants: { type: Number, default: 0 }, // 0 = unlimited
    image: { type: String, default: '' },

    // ── admin approval ──
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },

    // ── lifecycle ──
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
    },

    participants: [participantSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
