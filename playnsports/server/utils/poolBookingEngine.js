import PoolConfig from '../models/PoolConfig.js';
import PoolBookingSlot from '../models/PoolBookingSlot.js';

export const todayStr = () => new Date().toISOString().split('T')[0];

// How many days ahead a player is allowed to book (today counts as day 0).
export const MAX_ADVANCE_DAYS = 2;

// Max people one player can reserve per pool per calendar date, whether
// that's one 7-person booking or several smaller ones added up.
export const MAX_DAILY_HEADCOUNT = 7;

export const isWithinBookingWindow = (date) => {
  const today = todayStr();
  if (date < today) return false;
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);
  return date <= maxDate.toISOString().split('T')[0];
};

export const getOrCreateConfig = async (groundId) => {
  let config = await PoolConfig.findOne({ ground: groundId });
  if (!config) config = await PoolConfig.create({ ground: groundId });
  return config;
};

// Resolves which blocks actually apply to `pool` on `date` — the override
// for that exact date if one has been started, otherwise the recurring
// weekly template for that date's weekday. This is the single source of
// truth both the availability endpoint and the booking endpoint use, so
// they can never disagree about what's bookable.
export const effectiveBlocksForDate = (pool, date) => {
  if (pool.overrideDates.includes(date)) {
    return pool.overrideBlocks.filter((b) => b.date === date);
  }
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  return pool.weeklyBlocks.filter((b) => b.dayOfWeek === dayOfWeek);
};

export const findEffectiveBlock = (pool, date, startTime) =>
  effectiveBlocksForDate(pool, date).find((b) => b.startTime === startTime) || null;

// Atomically claims `partySize` headcount on one pool session. Always
// re-syncs the tracked capacity to the block's CURRENT effective capacity
// first, so an owner/admin raising or lowering it takes effect immediately
// — nothing about capacity is ever a stale snapshot. The claim itself uses
// the same $expr-guarded findOneAndUpdate pattern as claimSlotCapacity in
// bookingEngine.js, just against this flat collection instead of a nested
// array, which is what makes a single-document atomic comparison possible.
export async function claimPoolSlotCapacity({ groundId, poolId, date, startTime, endTime, capacity, userId, partySize = 1 }) {
  try {
    await PoolBookingSlot.findOneAndUpdate(
      { ground: groundId, pool: poolId, date, startTime },
      { $setOnInsert: { endTime, bookedCount: 0, bookedBy: [] }, $set: { capacity } },
      { upsert: true }
    );
  } catch (err) {
    // Duplicate key from a genuinely concurrent first-ever booking on this
    // exact slot — the other request already created it, fine, proceed.
    if (err.code !== 11000) throw err;
  }

  const claimed = await PoolBookingSlot.findOneAndUpdate(
    {
      ground: groundId,
      pool: poolId,
      date,
      startTime,
      $expr: { $lte: [{ $add: ['$bookedCount', partySize] }, '$capacity'] },
    },
    {
      $inc: { bookedCount: partySize },
      $push: { bookedBy: { $each: Array(partySize).fill(userId) } },
    },
    { new: true }
  );

  return claimed; // null means full (or a race lost) — reject upstream
}

// Releases headcount back (admin-initiated cancellation only for pool — see
// poolBookingController.adminCancelPoolBooking). Freeing space can never
// over-book, so this doesn't need the same atomic guard as claiming.
export async function releasePoolSlotCapacity({ groundId, poolId, date, startTime, userId, partySize = 1 }) {
  const doc = await PoolBookingSlot.findOne({ ground: groundId, pool: poolId, date, startTime });
  if (!doc) return null;

  doc.bookedCount = Math.max(0, doc.bookedCount - partySize);
  let removed = 0;
  doc.bookedBy = doc.bookedBy.filter((id) => {
    if (removed < partySize && String(id) === String(userId)) { removed += 1; return false; }
    return true;
  });
  await doc.save();
  return doc;
}
