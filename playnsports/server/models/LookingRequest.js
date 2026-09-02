import mongoose from 'mongoose';

// A single "Looking for Players" request — see docs/product notes for the
// full feature spec. Auto-expires via the TTL index below; the server also
// runs an active sweep (services/lookingExpiryService.js) so clients get a
// real-time `request:expired` event instead of waiting for Mongo's ~60s
// TTL sweep interval.
const lookingRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    sport: {
      type: String,
      required: true,
      set: (v) => (v ? v.toLowerCase() : v),
    },

    // Same GeoJSON shape as Player.location / Ground.location, for
    // consistency with the rest of the app's geo queries.
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    locationName: { type: String, default: '', trim: true },
    ground: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', default: null },

    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional', 'any'],
      default: 'any',
    },

    playersNeeded: { type: Number, required: true, min: 1, max: 30 },
    playersJoined: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // BGMI IDs for BGUS LFT — stored alongside the user IDs for auto-fill
    bgmiId: { type: String, trim: true, default: '' },
    playersJoinedInfo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        bgmiId: { type: String, trim: true, default: '' },
        _id: false,
      },
    ],

    scheduledFor: { type: Date, required: true },
    duration: { type: Number, default: 60 }, // minutes

    note: { type: String, default: '', trim: true, maxlength: 200 },

    status: {
      type: String,
      enum: ['active', 'full', 'expired', 'cancelled'],
      default: 'active',
    },

    // scheduledFor + duration, computed at creation time — this is what
    // both the TTL index and the active sweep key off of.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

lookingRequestSchema.index({ location: '2dsphere' });
lookingRequestSchema.index({ status: 1, expiresAt: 1 });
// TTL cleanup — safety net for eventual DB hygiene. Real-time expiry (the
// `request:expired` socket event) is handled by the active sweep instead,
// since Mongo only guarantees this runs "in the background," not promptly.
lookingRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('LookingRequest', lookingRequestSchema);
