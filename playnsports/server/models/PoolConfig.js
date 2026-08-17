import mongoose from 'mongoose';

// Real pools run fixed-duration sessions (e.g. 50 minutes) that don't line
// up to the hour, so start/end are free-form "HH:MM" rather than an
// hour-grid. `category` drives both the pink/general color coding and the
// girls-only confirmation popup on the player side — it is advisory only
// (no server-side gender gate): if someone books it and isn't female, no
// refund is given, exactly per the venue's own entry rules.
const CATEGORY_VALUES = ['general', 'girls_only'];

// One recurring block in a pool's weekly template. `dayOfWeek` follows JS
// Date#getDay() — 0 = Sunday ... 6 = Saturday. This is the pattern that
// repeats forever (every matching weekday, indefinitely) until the owner/
// admin edits or removes it, or a date-specific override exists for that
// particular date (see overrideBlocks below). A weekday with zero blocks is
// how "which day is the pool closed" is expressed — nothing hardcoded.
const weeklyBlockSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true }, // "HH:MM"
    endTime: { type: String, required: true }, // "HH:MM"
    capacity: { type: Number, required: true, min: 1 },
    category: { type: String, enum: CATEGORY_VALUES, default: 'general' },
  },
  { _id: true }
);

// One block that applies to exactly one calendar date, overriding whatever
// the weekly template would otherwise say for that date. Only meaningful
// for a date listed in `overrideDates` — see the note there.
const overrideBlockSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // "YYYY-MM-DD"
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    category: { type: String, enum: CATEGORY_VALUES, default: 'general' },
  },
  { _id: true }
);

// One physical pool at the venue (e.g. "Pool 1", "Pool 2"). Each pool has
// its own recurring weekly schedule and its own set of date overrides, so
// two pools at the same venue can run completely different hours.
const poolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    // Pre-fills the capacity field whenever a new block is quick-added in
    // the UI — not itself a cap on anything, just a convenient default.
    defaultCapacity: { type: Number, default: 20, min: 1 },
    weeklyBlocks: [weeklyBlockSchema],
    overrideBlocks: [overrideBlockSchema],
    // Dates currently running a custom (non-recurring) schedule. A date not
    // in this list always falls back to `weeklyBlocks` for its weekday —
    // that's the "automatically continue with previous one" default. A date
    // in this list uses only `overrideBlocks` for that date, even if that
    // ends up being zero blocks (owner closed the pool for that one day).
    overrideDates: [{ type: String }],
  },
  { _id: true }
);

// A pricing tier within a plan type (e.g. "LPU Hosteler" under "Monthly
// Membership"). This is the "WHO you are" half of pricing — the plan type
// is "HOW you're paying/accessing" (see planTypeSchema below). The amount
// charged for any one booking is always `price` × party size (see
// poolBookingController) — `price` is per person, not per booking.
const membershipCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "LPU Hosteler"
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

// A way of paying for pool access (e.g. "Single Session", "Monthly
// Membership", "Semester Membership"). Each plan type owns its own list of
// categories with their own prices — a category only ever appears under
// the plan type it was added to, so a player is never shown a combination
// that doesn't actually exist (no need to hide/disable invalid pairs,
// there simply are none to begin with).
const planTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Monthly Membership"
    billingLabel: { type: String, trim: true, default: 'per session' }, // e.g. "per month"
    isActive: { type: Boolean, default: true },
    categories: [membershipCategorySchema],
  },
  { _id: true }
);

const poolConfigSchema = new mongoose.Schema(
  {
    ground: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ground',
      required: true,
      unique: true,
    },
    pools: {
      type: [poolSchema],
      default: () => [{ name: 'Pool 1' }],
    },
    // Venue-level — shared across both pools, matching how the real venue's
    // pricing sheet was structured (one set of plan types for the whole
    // facility, not per physical pool).
    planTypes: [planTypeSchema],
    registrationFee: { type: Number, default: 0, min: 0 }, // one-time, see User.poolRegistrations
    coachingFee: { type: Number, default: 0, min: 0 }, // displayed only — coaching enrollment itself is "coming soon"
  },
  { timestamps: true }
);

export { CATEGORY_VALUES };
export default mongoose.model('PoolConfig', poolConfigSchema);
