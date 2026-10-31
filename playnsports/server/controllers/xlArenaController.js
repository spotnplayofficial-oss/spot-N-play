import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Ground from '../models/Ground.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import XlMembership from '../models/XlMembership.js';
import { getRazorpay } from '../utils/razorpay.js';
import { claimSlotCapacity, releaseSlotCapacity, splitAmount, sanitizeBookingForPlayer } from '../utils/bookingEngine.js';
import { generateTicketId } from '../utils/ticket.js';
import {
  notifySlotBooked,
  notifyArenaBookingRequest,
  notifyArenaBookingApproved,
  notifyArenaBookingRejected,
} from '../services/notificationService.js';
import { awardForPayment } from '../services/fitService.js';

// Arena membership catalogue. Single plan for now (Jaideep: Single
// Standard ₹990) — extend this array if XL adds more tiers later.
export const XL_PLANS = [
  { name: 'Standard', label: 'Single · per month', price: 990, months: 1, validityDays: 30 },
];

export const buildGroundPlans = (ground) => {
  const sub = ground?.customSubscriptionPricing;
  const plans = [];

  if (sub) {
    if (sub.oneMonth && Number(sub.oneMonth) > 0) {
      plans.push({
        name: 'Standard',
        label: '1 Month Membership',
        price: Number(sub.oneMonth),
        months: 1,
        validityDays: 30,
      });
    }
    if (sub.threeMonths && Number(sub.threeMonths) > 0) {
      plans.push({
        name: 'Quarterly',
        label: '3 Months Membership',
        price: Number(sub.threeMonths),
        months: 3,
        validityDays: 90,
      });
    }
    if (sub.sixMonths && Number(sub.sixMonths) > 0) {
      plans.push({
        name: 'HalfYearly',
        label: '6 Months Membership',
        price: Number(sub.sixMonths),
        months: 6,
        validityDays: 180,
      });
    }
    if (sub.yearly && Number(sub.yearly) > 0) {
      plans.push({
        name: 'Annual',
        label: '1 Year Membership',
        price: Number(sub.yearly),
        months: 12,
        validityDays: 365,
      });
    }
    if (Array.isArray(sub.customMonths)) {
      for (const cm of sub.customMonths) {
        if (Number(cm.price) > 0 && Number(cm.months) > 0) {
          plans.push({
            name: `${cm.months}Months`,
            label: `${cm.months} Months Membership`,
            price: Number(cm.price),
            months: Number(cm.months),
            validityDays: Number(cm.months) * 30,
          });
        }
      }
    }
  }

  // Fallback to default Standard plan (990) if venue owner hasn't customized subscription
  if (plans.length === 0) {
    plans.push({
      name: 'Standard',
      label: 'Single · per month',
      price: 990,
      months: 1,
      validityDays: 30,
    });
  }

  return plans;
};

const VALIDITY_DAYS = 30;

const activeMembership = (userId, groundId) =>
  XlMembership.findOne({
    user: userId,
    ground: groundId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

// GET /api/xl/:groundId/info — plans + my current membership (if any)
const getXlInfo = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.groundId).select('name venueType venueMode approvalStatus sports address pricingPreference customPricingTypes customSubscriptionPricing customPricePerHour');
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const mine = await activeMembership(req.user._id, ground._id);
  const plans = buildGroundPlans(ground);
  const subscriptionEnabled =
    ground.pricingPreference !== 'custom' ||
    ground.customPricingTypes?.subscription !== false;

  res.json({
    ground: {
      _id: ground._id,
      name: ground.name,
      address: ground.address,
      pricingPreference: ground.pricingPreference,
      customPricingTypes: ground.customPricingTypes,
      customSubscriptionPricing: ground.customSubscriptionPricing,
    },
    subscriptionEnabled,
    plans,
    myMembership: mine
      ? { planName: mine.planName, price: mine.price, purchasedAt: mine.purchasedAt, expiresAt: mine.expiresAt, status: mine.status }
      : null,
  });
});

// POST /api/xl/:groundId/membership/order — full-payment Razorpay order
const createMembershipOrder = asyncHandler(async (req, res) => {
  const { planName = 'Standard', preferredHour = '' } = req.body;
  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  if (ground.venueMode !== 'live') {
    res.status(403);
    throw new Error('Membership opens once the venue goes live');
  }
  const plans = buildGroundPlans(ground);
  const plan = plans.find((p) => p.name === planName) || plans[0];
  if (!plan) {
    res.status(400);
    throw new Error('Unknown membership plan');
  }
const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: plan.price * 100,
    currency: 'INR',
    receipt: `xlmem_${Date.now()}`,
    notes: { groundId: ground._id.toString(), playerId: req.user._id.toString(), planName: plan.name, preferredHour, type: 'xl_membership' },
  });
  res.json({ orderId: order.id, amount: plan.price, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, plan });
});

// POST /api/xl/:groundId/membership/verify — HMAC check → 30-day pass
const verifyMembershipPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planName = 'Standard', preferredHour = '' } = req.body;
  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const plans = buildGroundPlans(ground);
  const plan = plans.find((p) => p.name === planName) || plans[0];
  if (!plan) {
    res.status(400);
    throw new Error('Unknown membership plan');
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expected !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }
const now = new Date();
  const existing = await activeMembership(req.user._id, ground._id);
  // Renewals extend from the current expiry so members never lose days.
  const start = existing && existing.expiresAt > now ? existing.expiresAt : now;
  const validityDays = plan.validityDays || (plan.months ? plan.months * 30 : VALIDITY_DAYS);
  const expiresAt = new Date(start.getTime() + validityDays * 24 * 60 * 60 * 1000);
  if (existing) {
    existing.expiresAt = expiresAt;
    existing.price = plan.price;
    existing.planName = plan.name;
    existing.payment = { razorpayOrderId, razorpayPaymentId };
    await existing.save();
    return res.json({ message: 'Membership renewed ✅', myMembership: { planName: existing.planName, price: existing.price, expiresAt: existing.expiresAt, status: existing.status } });
  }
  const membership = await XlMembership.create({
    user: req.user._id,
    ground: ground._id,
    planName: plan.name,
    price: plan.price,
    purchasedAt: now,
    expiresAt,
    status: 'active',
    payment: { razorpayOrderId, razorpayPaymentId },
  });
  res.json({ message: 'Membership activated ✅', myMembership: { planName: membership.planName, price: membership.price, expiresAt: membership.expiresAt, status: membership.status } });
});

// ── Arena turf booking (mirrors xlarena.com/booking) ────────────────────
// 5-step flow: Arena → Game → Date → Time Slots → Confirm.
// Unlike pools (shared water, full payment), an arena turf is exclusive
// (capacity 1) and players routinely book several CONTINUOUS hourly slots
// in one go, paying Full now or a ₹500 Token now (rest at the arena).

// ── Payment binding ────────────────────────────────────────────────────
// Every verify path fetches the order back from Razorpay and checks the
// amount + identity fields against what we're about to grant. See
// utils/orderGuard.js for why a signature alone isn't enough.
import { assertOrderMatches } from '../utils/orderGuard.js';

const TOKEN_AMOUNT = 500;
const MAX_SLOTS_PER_ORDER = 6;
const MAX_ADVANCE_DAYS = 30;

const todayStr = () => new Date().toISOString().split('T')[0];
const plusDaysStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const slotHours = (slot) => {
  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  return Math.max((eh * 60 + em - (sh * 60 + sm)) / 60, 0) || 1;
};
const isPastToday = (slot) => {
  if (slot.date !== todayStr()) return false;
  const [h, m] = slot.startTime.split(':').map(Number);
  const now = new Date();
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
};

// Shared resolver for order + verify — everything re-derived server-side,
// never trusted from the client body beyond identifying slotIds + payMode.
const resolveArenaContext = async (groundId, slotIds, payMode) => {
  if (!['full', 'token'].includes(payMode)) {
    const e = new Error("payMode must be 'full' or 'token'");
    e.status = 400;
    throw e;
  }
  const ids = [...new Set((slotIds || []).map(String))].filter(Boolean);
  if (ids.length < 1 || ids.length > MAX_SLOTS_PER_ORDER) {
    const e = new Error(`Select 1 to ${MAX_SLOTS_PER_ORDER} time slots`);
    e.status = 400;
    throw e;
  }
  const ground = await Ground.findById(groundId);
  if (!ground) {
    const e = new Error('Venue not found');
    e.status = 404;
    throw e;
  }
  if (ground.venueMode !== 'live') {
    const e = new Error('Booking opens once the venue goes live');
    e.status = 403;
    throw e;
  }
  const slots = ids.map((id) => ground.slots.id(id)).filter(Boolean);
  if (slots.length !== ids.length) {
    const e = new Error('One or more slots no longer exist');
    e.status = 404;
    throw e;
  }
  const maxDate = plusDaysStr(MAX_ADVANCE_DAYS);
  for (const s of slots) {
    if (s.date < todayStr() || s.date > maxDate || isPastToday(s)) {
      const e = new Error('One or more slots are no longer bookable (past date or outside the 30-day window)');
      e.status = 400;
      throw e;
    }
    if (s.bookedCount + 1 > s.capacity) {
      const e = new Error('One or more slots just got filled — please pick another time');
      e.status = 409;
      throw e;
    }
  }
  // Same turf, same day, back-to-back times (e.g. 17:00–18:00 + 18:00–19:00).
  const date = slots[0].date;
  const sportId = String(slots[0].sportId);
  const courtId = String(slots[0].courtId || '');
  if (!slots.every((s) => s.date === date && String(s.sportId) === sportId && String(s.courtId || '') === courtId)) {
    const e = new Error('Please select continuous time slots on the same turf and day');
    e.status = 400;
    throw e;
  }
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].startTime !== slots[i - 1].endTime) {
      const e = new Error('Please select continuous time slots');
      e.status = 400;
      throw e;
    }
  }
  const sportDoc = ground.sports.id(slots[0].sportId);
  if (!sportDoc) {
    const e = new Error('Sport configuration missing for this slot');
    e.status = 400;
    throw e;
  }
  const ratePerHour = (ground?.pricingPreference === 'custom' && ground?.customPricePerHour > 0)
    ? ground.customPricePerHour
    : (sportDoc.pricePerHour || 0);

  const priced = slots.map((s) => {
    const slotTotal = Math.round(ratePerHour * slotHours(s));
    return { slot: s, slotTotal, split: splitAmount(ground, slotTotal, 1) };
  });
  const total = priced.reduce((sum, p) => sum + p.slotTotal, 0);
  const payable = payMode === 'full' ? total : Math.min(TOKEN_AMOUNT, total);
  return { ground, sportDoc, slots, priced, total, payable, remaining: total - payable, date, payMode };
};

// ── STEP 5: Send Booking Request to Venue Owner ─────────────────────────
// POST /api/xl/:groundId/booking-request { slotIds[], payMode }
// Request contains: user name, date opted, time slot opted, and game
const createArenaBookingRequest = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Venue not found');
  }

  const isSubscriptionVenue = Boolean(
    req.body.isSubscription ||
    ground.venueType === 'gym' ||
    (ground.pricingPreference === 'custom' && ground.customPricingTypes?.hourly === false)
  );

  if (isSubscriptionVenue) {
    const plans = buildGroundPlans(ground);
    const plan = plans.find((p) => p.name === req.body.planName) || plans[0];
    const planPrice = plan?.price || Number(ground.customSubscriptionPricing?.oneMonth) || 600;
    const preferredHour = req.body.preferredHour || '06:00 — 07:00';
    const [startTime = '06:00', endTime = '07:00'] = preferredHour.split('—').map((t) => t.trim());
    const gameName = ground.sports?.[0]?.name || 'Gym';

    const existing = await Booking.findOne({
      player: req.user._id,
      ground: ground._id,
      status: { $in: ['pending_approval', 'advance_pending'] },
    }).sort({ createdAt: -1 });

    if (existing) {
      const isApproved = existing.status === 'advance_pending';
      return res.json({
        success: true,
        message: isApproved
          ? 'Booking request already approved by venue owner! Proceed to payment.'
          : 'Booking request already submitted. Awaiting venue owner confirmation.',
        status: isApproved ? 'advance_pending' : 'pending_approval',
        bookings: [sanitizeBookingForPlayer(existing)],
        requestDetails: {
          userName: req.user.name,
          game: `${gameName} (${plan?.label || 'Membership'})`,
          date: 'Monthly Pass',
          startTime: existing.startTime || startTime,
          endTime: existing.endTime || endTime,
          venueName: ground.name,
          total: existing.totalPrice || planPrice,
          payable: existing.advancePrice || planPrice,
        },
      });
    }

    const split = splitAmount(ground, planPrice, 1);
    const booking = await Booking.create({
      player: req.user._id,
      ground: ground._id,
      sportName: gameName,
      partySize: 1,
      date: todayStr(),
      startTime,
      endTime,
      totalPrice: planPrice,
      advancePrice: planPrice,
      remainingPrice: 0,
      commissionPercent: split.commissionPercent,
      platformCommission: split.platformCommission,
      ownerPayout: split.ownerPayout,
      ticketId: generateTicketId(),
      status: 'pending_approval',
    });

    await notifyArenaBookingRequest({
      ownerId: ground.owner,
      actorId: req.user._id,
      actorName: req.user.name || 'A Player',
      groundId: ground._id,
      groundName: ground.name,
      game: `${gameName} (${plan?.label || 'Membership'})`,
      date: 'Monthly Pass',
      startTime,
      endTime,
      bookingId: booking._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Booking request sent to venue owner! ⏳ Awaiting confirmation.',
      status: 'pending_approval',
      bookings: [sanitizeBookingForPlayer(booking)],
      requestDetails: {
        userName: req.user.name,
        game: `${gameName} (${plan?.label || 'Membership'})`,
        date: 'Monthly Pass',
        startTime,
        endTime,
        venueName: ground.name,
        total: planPrice,
        payable: planPrice,
      },
    });
  }

  let ctx;
  try {
    ctx = await resolveArenaContext(req.params.groundId, req.body.slotIds, req.body.payMode || 'token');
  } catch (err) {
    res.status(err.status || 500);
    throw err;
  }

  const slotIds = ctx.slots.map((s) => s._id);

  // Check if player already sent a pending or approved request for these slots
  const existing = await Booking.find({
    player: req.user._id,
    ground: ctx.ground._id,
    slot: { $in: slotIds },
    status: { $in: ['pending_approval', 'advance_pending'] },
  });

  if (existing.length > 0) {
    const isApproved = existing.every((b) => b.status === 'advance_pending');
    return res.json({
      success: true,
      message: isApproved
        ? 'Booking request already approved by venue owner! Proceed to payment.'
        : 'Booking request already submitted. Awaiting venue owner confirmation.',
      status: isApproved ? 'advance_pending' : 'pending_approval',
      bookings: existing.map(sanitizeBookingForPlayer),
      requestDetails: {
        userName: req.user.name,
        game: ctx.sportDoc?.name || 'turf',
        date: ctx.date,
        startTime: ctx.slots[0].startTime,
        endTime: ctx.slots[ctx.slots.length - 1].endTime,
        venueName: ctx.ground.name,
        total: ctx.total,
        payable: ctx.payable,
      },
    });
  }

  // Create booking records with status 'pending_approval'
  let assigned = 0;
  const bookings = [];
  for (let i = 0; i < ctx.priced.length; i++) {
    const { slot, slotTotal, split } = ctx.priced[i];
    const isLast = i === ctx.priced.length - 1;
    const share = isLast ? ctx.payable - assigned : Math.round((slotTotal / ctx.total) * ctx.payable);
    assigned += share;
    const remaining = slotTotal - share;

    const booking = await Booking.create({
      player: req.user._id,
      ground: ctx.ground._id,
      slot: slot._id,
      sportId: slot.sportId,
      sportName: ctx.sportDoc?.name || '',
      courtId: slot.courtId,
      courtName: slot.courtId ? ctx.sportDoc?.courts?.id(slot.courtId)?.name || '' : '',
      partySize: 1,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalPrice: slotTotal,
      advancePrice: share,
      remainingPrice: remaining,
      commissionPercent: split.commissionPercent,
      platformCommission: Math.round(split.platformCommission * (slotTotal / ctx.total)),
      ownerPayout: slotTotal - Math.round(split.platformCommission * (slotTotal / ctx.total)),
      ticketId: generateTicketId(),
      status: 'pending_approval',
    });
    bookings.push(booking);
  }

  // Explicitly notify the venue owner with user name, date opted, time slot opted, and game
  await notifyArenaBookingRequest({
    ownerId: ctx.ground.owner,
    actorId: req.user._id,
    actorName: req.user.name || 'A Player',
    groundId: ctx.ground._id,
    groundName: ctx.ground.name,
    game: ctx.sportDoc?.name || 'turf',
    date: ctx.date,
    startTime: ctx.slots[0].startTime,
    endTime: ctx.slots[ctx.slots.length - 1].endTime,
    bookingId: bookings[0]._id,
  });

  res.status(201).json({
    success: true,
    message: 'Booking request sent to venue owner! ⏳ Awaiting confirmation.',
    status: 'pending_approval',
    bookings: bookings.map(sanitizeBookingForPlayer),
    requestDetails: {
      userName: req.user.name,
      game: ctx.sportDoc?.name || 'turf',
      date: ctx.date,
      startTime: ctx.slots[0].startTime,
      endTime: ctx.slots[ctx.slots.length - 1].endTime,
      venueName: ctx.ground.name,
      total: ctx.total,
      payable: ctx.payable,
    },
  });
});

// GET /api/xl/:groundId/my-request-status?slotIds=...
// Player checks if their booking request has been accepted by the venue owner
const getMyArenaRequestStatus = asyncHandler(async (req, res) => {
  const { slotIds } = req.query;
  const ids = (slotIds ? slotIds.split(',') : []).map((id) => id.trim()).filter(Boolean);

  const query = {
    player: req.user._id,
    ground: req.params.groundId,
  };
  if (ids.length > 0) {
    query.slot = { $in: ids };
  }

  const bookings = await Booking.find(query)
    .sort({ createdAt: -1 })
    .limit(ids.length > 0 ? ids.length : 6);

  if (bookings.length === 0) {
    return res.json({ hasRequest: false, status: null });
  }

  const allApproved = bookings.every((b) => b.status === 'advance_pending' || b.status === 'advance_paid' || b.status === 'completed');
  const anyDeclined = bookings.some((b) => b.status === 'cancelled');
  const anyPending = bookings.some((b) => b.status === 'pending_approval');

  let currentStatus = 'pending_approval';
  if (allApproved) currentStatus = 'advance_pending';
  else if (anyDeclined) currentStatus = 'cancelled';
  else if (anyPending) currentStatus = 'pending_approval';

  res.json({
    hasRequest: true,
    status: currentStatus,
    bookings: bookings.map(sanitizeBookingForPlayer),
  });
});

// PATCH /api/xl/:groundId/booking-requests/:bookingId/respond { action: 'accept' | 'decline' }
// Venue owner accepts or declines the booking request
const respondToArenaBookingRequest = asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) {
    res.status(400);
    throw new Error("Action must be either 'accept' or 'decline'");
  }

  const ground = await Ground.findById(req.params.groundId);
  if (!ground) {
    res.status(404);
    throw new Error('Ground not found');
  }

  const isOwner = req.user.role === 'admin' || String(ground.owner?._id || ground.owner) === String(req.user._id);
  if (!isOwner) {
    res.status(403);
    throw new Error('Unauthorized: only the venue owner can respond to booking requests');
  }

  const targetBooking = await Booking.findById(req.params.bookingId).populate('player', 'name email phone');
  if (!targetBooking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Find all sibling slot bookings submitted by the same player in the same request batch
  const siblings = await Booking.find({
    ground: ground._id,
    player: targetBooking.player._id,
    date: targetBooking.date,
    status: 'pending_approval',
    createdAt: {
      $gte: new Date(targetBooking.createdAt.getTime() - 60000),
      $lte: new Date(targetBooking.createdAt.getTime() + 60000),
    },
  });

  const targets = siblings.length > 0 ? siblings : [targetBooking];

  if (action === 'accept') {
    for (const b of targets) {
      b.status = 'advance_pending';
      await b.save();
    }

    await notifyArenaBookingApproved({
      recipientId: targetBooking.player._id,
      actorId: req.user._id,
      groundId: ground._id,
      groundName: ground.name,
      game: targetBooking.sportName || 'turf',
      date: targetBooking.date,
      startTime: targets[0].startTime,
      endTime: targets[targets.length - 1].endTime,
      bookingId: targetBooking._id,
    });

    res.json({
      success: true,
      message: 'Booking request accepted! Player can now proceed to payment 🎉',
      status: 'advance_pending',
    });
  } else {
    for (const b of targets) {
      b.status = 'cancelled';
      await b.save();
    }

    await notifyArenaBookingRejected({
      recipientId: targetBooking.player._id,
      actorId: req.user._id,
      groundId: ground._id,
      groundName: ground.name,
      game: targetBooking.sportName || 'turf',
      date: targetBooking.date,
      startTime: targets[0].startTime,
      endTime: targets[targets.length - 1].endTime,
      bookingId: targetBooking._id,
    });

    res.json({
      success: true,
      message: 'Booking request declined.',
      status: 'cancelled',
    });
  }
});

// POST /api/xl/:groundId/arena-order { slotIds[], payMode }
const createArenaOrder = asyncHandler(async (req, res) => {
  let ctx;
  try {
    ctx = await resolveArenaContext(req.params.groundId, req.body.slotIds, req.body.payMode || 'token');
  } catch (err) {
    res.status(err.status || 500);
    throw err;
  }
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: ctx.payable * 100,
    currency: 'INR',
    receipt: `xlarena_${Date.now()}`,
    notes: {
      groundId: ctx.ground._id.toString(),
      playerId: req.user._id.toString(),
      slotIds: ctx.slots.map((s) => String(s._id)).sort().join(','),
      payMode: ctx.payMode,
      type: 'xl_arena',
    },
  });
  res.json({
    orderId: order.id,
    amount: ctx.payable,
    total: ctx.total,
    remaining: ctx.remaining,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    payMode: ctx.payMode,
    slots: ctx.slots.map((s) => ({ _id: s._id, date: s.date, startTime: s.startTime, endTime: s.endTime })),
  });
});

// POST /api/xl/:groundId/arena-verify { razorpay..., slotIds[], payMode }
// ── Payment binding ────────────────────────────────────────────────────
// A valid HMAC signature only proves "the user really paid THIS order" —
// it says nothing about what they're trying to buy with it. Without an
// explicit binding, a confirmed ₹500 order could be replayed at verify
// time to claim a ₹1500 booking (price tampering). So every verify path
// fetches the order back from Razorpay and checks amount + identity

const verifyArenaPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expected !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }
  let ctx;
  try {
    ctx = await resolveArenaContext(req.params.groundId, req.body.slotIds, req.body.payMode || 'token');
  } catch (err) {
    res.status(err.status || 500);
    throw err;
  }

  // Bind the order to exactly this slot set, amount and payMode.
  const wantedSlotIds = ctx.slots
    .map((s) => String(s._id))
    .sort()
    .join(',');
  await assertOrderMatches({
    razorpay: getRazorpay(),
    orderId: razorpayOrderId,
    expectedAmount: ctx.payable,
    playerId: req.user._id,
    kind: 'xl_arena',
    match: {
      groundId: String(ctx.ground._id),
      slotIds: wantedSlotIds,
      payMode: ctx.payMode,
    },
  });

  // Claim every slot; unwind on partial failure (payment already captured —
  // surface it exactly like the single-slot flow does).
  const claimed = [];
  for (const s of ctx.slots) {
    const ok = await claimSlotCapacity({ groundId: ctx.ground._id, slotId: s._id, userId: req.user._id, partySize: 1 });
    if (!ok) {
      for (const c of claimed) {
        await releaseSlotCapacity({ groundId: ctx.ground._id, slotId: c._id, userId: req.user._id, partySize: 1 });
      }
      res.status(409);
      throw new Error('A slot was just filled by someone else. Your payment was captured — please contact support for a refund.');
    }
    claimed.push(s);
  }

  // Split the paid amount across slots proportionally (remainder on last).
  let assigned = 0;
  const bookings = [];
  for (let i = 0; i < ctx.priced.length; i++) {
    const { slot, slotTotal, split } = ctx.priced[i];
    const isLast = i === ctx.priced.length - 1;
    const share = isLast ? ctx.payable - assigned : Math.round((slotTotal / ctx.total) * ctx.payable);
    assigned += share;
    const remaining = slotTotal - share;
    const done = remaining <= 0;
    // Check if an existing approved booking request exists for this slot
    let booking = await Booking.findOne({
      player: req.user._id,
      ground: ctx.ground._id,
      slot: slot._id,
      status: { $in: ['advance_pending', 'pending_approval'] },
    });

    if (booking) {
      booking.advancePrice = share;
      booking.remainingPrice = remaining;
      booking.status = done ? 'completed' : 'advance_paid';
      if (!booking.ticketId) booking.ticketId = generateTicketId();
    } else {
      booking = await Booking.create({
        player: req.user._id,
        ground: ctx.ground._id,
        slot: slot._id,
        sportId: slot.sportId,
        sportName: ctx.sportDoc?.name || '',
        courtId: slot.courtId,
        courtName: slot.courtId ? ctx.sportDoc?.courts?.id(slot.courtId)?.name || '' : '',
        partySize: 1,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalPrice: slotTotal,
        advancePrice: share,
        remainingPrice: remaining,
        commissionPercent: split.commissionPercent,
        platformCommission: Math.round(split.platformCommission * (slotTotal / ctx.total)),
        ownerPayout: slotTotal - Math.round(split.platformCommission * (slotTotal / ctx.total)),
        ticketId: generateTicketId(),
        status: done ? 'completed' : 'advance_paid',
      });
    }
    const payment = await Payment.create({
      booking: booking._id,
      player: req.user._id,
      ground: ctx.ground._id,
      totalAmount: slotTotal,
      advanceAmount: share,
      remainingAmount: remaining,
      commissionPercent: split.commissionPercent,
      platformCommission: Math.round(split.platformCommission * (slotTotal / ctx.total)),
      ownerPayout: slotTotal - Math.round(split.platformCommission * (slotTotal / ctx.total)),
      advancePayment: { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() },
      finalPayment: done ? { status: 'not_due' } : { status: 'pending' },
      status: done ? 'completed' : 'advance_paid',
    });
    booking.payment = payment._id;
    await booking.save();
    bookings.push(booking);
  }

  notifySlotBooked({
    ownerId: ctx.ground.owner,
    actorId: req.user._id,
    groundId: ctx.ground._id,
    groundName: ctx.ground.name,
    date: ctx.date,
    startTime: ctx.slots[0].startTime,
    endTime: ctx.slots[ctx.slots.length - 1].endTime,
  });

  // Only the money that actually moved earns coins — a token booking
  // credits ₹500 of coins now and the rest when the balance is paid.
  const earned = await awardForPayment({
    userId: req.user._id,
    amountPaid: ctx.payable,
    bookingId: bookings[0]._id,
    note: `XL Arena — ${ctx.sportDoc?.name || 'Turf'} · ${ctx.slots.length} slot(s)`,
  });

  res.json({
    message: ctx.remaining > 0 ? 'Turf booked — token paid, rest at the arena ✅' : 'Turf booked — fully paid ✅',
    bookings: bookings.map(sanitizeBookingForPlayer),
    total: ctx.total,
    paid: ctx.payable,
    remaining: ctx.remaining,
    // Shown in the success screen ("+500 Fitcoin earned") — the moment the
    // economy becomes real to the player.
    earned: earned ? { fitcoin: earned.fitcoin, fitPoints: earned.fitPoints } : null,
  });
});

export {
  getXlInfo,
  createMembershipOrder,
  verifyMembershipPayment,
  createArenaBookingRequest,
  getMyArenaRequestStatus,
  respondToArenaBookingRequest,
  createArenaOrder,
  verifyArenaPayment,
};