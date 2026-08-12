import mongoose from 'mongoose';

// A materialized, real, single instance of one pool's session on one exact
// date — created lazily the first time anyone books that (pool, date,
// startTime) combination. This is deliberately a flat top-level collection
// (not nested inside PoolConfig) so the capacity claim can be a single
// atomic findOneAndUpdate with a plain $expr comparison, the same pattern
// Ground.slots already uses — nesting this two levels deep inside
// PoolConfig.pools[] would make that atomic comparison impossible to
// express safely.
//
// `capacity` is re-synced from the pool's current effective template
// capacity on every booking attempt (see poolBookingEngine.js), so an
// owner/admin raising or lowering a slot's capacity takes effect
// immediately for players — it is never a stale one-time snapshot.
const poolBookingSlotSchema = new mongoose.Schema(
  {
    ground: { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true },
    pool: { type: mongoose.Schema.Types.ObjectId, required: true }, // PoolConfig.pools[]._id
    date: { type: String, required: true }, // "YYYY-MM-DD"
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    bookedCount: { type: Number, default: 0, min: 0 },
    bookedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

poolBookingSlotSchema.index({ ground: 1, pool: 1, date: 1, startTime: 1 }, { unique: true });

export default mongoose.model('PoolBookingSlot', poolBookingSlotSchema);
