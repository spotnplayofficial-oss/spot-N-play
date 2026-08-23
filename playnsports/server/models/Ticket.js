import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    eventTitle: { type: String, required: true },
    sport: { type: String, required: true },
    venue: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    price: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['free', 'paid'], default: 'free' },
    organizer: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      avatar: { type: String },
    },
    status: {
      type: String,
      enum: ['active', 'used', 'cancelled'],
      default: 'active',
    },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Ticket', ticketSchema);
