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

// Same shape as participantSchema, plus `quantity` — how many tickets this
// single booking covers under one player (mirrors `partySize` on the
// ground/pool Booking model). One ticket ID is issued per booking and
// covers the whole party, not one per seat.
const subEventBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quantity: { type: Number, default: 1, min: 1 },
    joinedAt: { type: Date, default: Date.now },
    paymentStatus: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    amountPaid: { type: Number, default: 0 },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },

    ticketId: { type: String, default: '' },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    ticketEmailSent: { type: Boolean, default: false },
  },
  { _id: false }
);

// A single activity inside a parent event — e.g. "Under-16 Football" and
// "Open Cricket Box League" living inside one "Summer Sports Meet" event.
// Each sub-event has its own venue/date/time/price/capacity so they can run
// completely independently of one another.
const subEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a sub-event title'],
    trim: true,
  },
  description: { type: String, trim: true, default: '' },
  image: { type: String, default: '' }, // optional own banner, falls back to parent event's

  eventType: {
    type: String,
    enum: ['free', 'paid'],
    default: 'free',
  },
  price: { type: Number, default: 0 },

  venue: {
    type: String,
    required: [true, 'Please add a venue / location for the sub-event'],
    trim: true,
  },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },

  // Total number of seats across all players. 0 = unlimited.
  capacity: { type: Number, default: 0 },
  // How many tickets a single player is allowed to book in one go for
  // *this* sub-event — dynamic per sub-event (e.g. 7 for one, 5 for
  // another).
  maxTicketsPerBooking: { type: Number, default: 1, min: 1 },

  status: {
    type: String,
    enum: ['upcoming', 'completed', 'cancelled'],
    default: 'upcoming',
  },

  bookings: [subEventBookingSchema],
});

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
    // Not schema-required: for a sub-event container these are derived from
    // the earliest sub-event instead of being entered directly (see
    // eventController#deriveTopLevelFields). Still required by the
    // controller for a plain (non-sub-event) event.
    venue: { type: String, trim: true, default: '' },
    date: { type: String, default: '' },       // 'YYYY-MM-DD'
    startTime: { type: String, default: '' },  // 'HH:mm'
    endTime: { type: String, default: '' },    // 'HH:mm'

    maxParticipants: { type: Number, default: 0 }, // 0 = unlimited
    image: { type: String, default: '' },

    // ── sub-events ──
    // When this is non-empty, the event is a "container" — players book
    // through its sub-events instead of joining the parent event directly.
    // The flat venue/date/time/price/maxParticipants/participants fields
    // above stay as-is for events that don't use sub-events at all.
    subEvents: [subEventSchema],

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
