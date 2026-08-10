import mongoose from 'mongoose';

// A single lead for a venue that isn't (yet) on real slot booking.
// Deliberately generic — 'venue' rather than 'gym' — so any venue type
// (ground/social/gym/pool) reuses this while it's in trial or interest
// mode (see Ground.venueMode), without a new model per type.
const venueLeadSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 'trial'    = claimed a 2-day walk-in trial (ticket + owner check-in).
    // 'interest' = lighter signal — just opened the venue while it's in
    // interest-only mode. No ticket, no check-in, no expiry.
    type: { type: String, enum: ['trial', 'interest'], default: 'trial' },

    // Same human-readable format as event tickets (SPT-XXXXXXXX) — the
    // venue owner types/reads this at check-in, same UX as event doors.
    // Only meaningful for type: 'trial'; interest leads still get one
    // generated for schema consistency but nothing ever reads it.
    ticketId: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: ['interested', 'checked_in', 'expired'],
      default: 'interested',
    },

    issuedAt: { type: Date, default: Date.now },
    // 2 days from the moment a trial was claimed. Not applicable to
    // 'interest' leads, which never expire — hence not required for those.
    expiresAt: { type: Date, required: function () { return this.type !== 'interest'; } },
    checkedInAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One lead document per user per venue, ever — a reclaim after expiry
// updates this same document (new ticketId/dates) rather than inserting a
// second row, so the unique index below can't be violated. Switching a
// venue between trial/interest mode reuses the same document too (the
// `type` field just gets overwritten), so a user's history with a venue
// stays as a single row no matter how its mode changes over time.
venueLeadSchema.index({ venue: 1, user: 1 }, { unique: true });

export default mongoose.model('VenueLead', venueLeadSchema);
