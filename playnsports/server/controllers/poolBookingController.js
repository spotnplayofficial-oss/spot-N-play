import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Ground from '../models/Ground.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import PoolBookingSlot from '../models/PoolBookingSlot.js';
import { getRazorpay } from '../utils/razorpay.js';
import { splitAmount, sanitizeBookingForPlayer } from '../utils/bookingEngine.js';
import { generateTicketId } from '../utils/ticket.js';
import { sendPoolBookingEmail } from '../utils/sendEmail.js';
import { notifySlotBooked, notifyPoolBookingConfirmed } from '../services/notificationService.js';
import {
  todayStr, isWithinBookingWindow, isSlotExpired, MAX_ADVANCE_DAYS, MAX_DAILY_HEADCOUNT,
  getOrCreateConfig, effectiveBlocksForDate, findEffectiveBlock, claimPoolSlotCapacity, releasePoolSlotCapacity,
} from '../utils/poolBookingEngine.js';

const clampParty = (n) => Math.max(1, Math.min(Number(n) || 1, MAX_DAILY_HEADCOUNT));

const loadLiveBookablePool = async (groundId) => {
  const ground = await Ground.findById(groundId);
  if (!ground || ground.venueType !== 'pool') return { error: { status: 404, message: 'Pool venue not found' } };
  if (ground.approvalStatus !== 'approved' || ground.venueMode !== 'live') {
    return { error: { status: 403, message: 'This venue is still in its trial phase — booking opens once it goes live' } };
  }
  return { ground };
};

// Sum of headcount this player already has reserved at this venue on this
// date, across every pool and every booking — the "max 7 slots a day"
// rule, whether that's one booking of 7 or several smaller ones.
const dailyHeadcountUsed = async (playerId, groundId, date, excludeBookingId = null) => {
  const query = {
    player: playerId,
    ground: groundId,
    date,
    poolId: { $ne: null },
    status: { $nin: ['cancelled', 'refunded'] },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const bookings = await Booking.find(query).select('partySize');
  return bookings.reduce((sum, b) => sum + (b.partySize || 1), 0);
};

// ── Availability (read-only, any authenticated user) ────────────────────

const getPoolAvailability = asyncHandler(async (req, res) => {
  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(200); return res.json({ pools: [], notice: error.message }); }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayStr();
  if (!isWithinBookingWindow(date)) {
    res.status(400);
    throw new Error(`Bookings are only open for today through the next ${MAX_ADVANCE_DAYS} days`);
  }

  const config = await getOrCreateConfig(ground._id);

  const bookedDocs = await PoolBookingSlot.find({ ground: ground._id, date });
  const bookedMap = {};
  bookedDocs.forEach((d) => { bookedMap[`${d.pool}:${d.startTime}`] = d.bookedCount; });

  const pools = config.pools
    .filter((p) => p.isActive)
    .map((p) => ({
      poolId: p._id,
      name: p.name,
      slots: effectiveBlocksForDate(p, date)
        .slice()
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((b) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
          capacity: b.capacity,
          bookedCount: bookedMap[`${p._id}:${b.startTime}`] || 0,
          expired: isSlotExpired(date, b.startTime),
        })),
    }));

  res.json({ date, maxAdvanceDays: MAX_ADVANCE_DAYS, pools });
});

// ── Plan types + fees (read-only, any authenticated user) ───────────────

const getPoolPlans = asyncHandler(async (req, res) => {
  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(error.status); throw new Error(error.message); }

  const config = await getOrCreateConfig(ground._id);
  res.json({
    planTypes: config.planTypes
      .filter((p) => p.isActive)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        billingLabel: p.billingLabel,
        categories: p.categories.filter((c) => c.isActive),
      }))
      .filter((p) => p.categories.length > 0), // a plan type with no active category isn't selectable
    registrationFee: config.registrationFee,
    coachingFee: config.coachingFee,
    alreadyRegistered: req.user.poolRegistrations?.some((id) => String(id) === String(ground._id)) || false,
    medicalCertificateUrl: req.user.medicalCertificateUrl || '',
    maxPartySize: MAX_DAILY_HEADCOUNT,
    maxAdvanceDays: MAX_ADVANCE_DAYS,
  });
});

// ── Checkout ─────────────────────────────────────────────────────────────

// Re-derives everything server-side from the request's identifying fields
// only (poolId/date/startTime/planTypeId/categoryId/partySize) — never
// trusts a client-sent price. Shared by both createPoolOrder and
// verifyPoolPayment so the amount charged can never drift between the two
// steps.
const resolveBookingContext = async (ground, req) => {
  const { poolId, date, startTime, planTypeId, categoryId, includeRegistration, healthConfirmed } = req.body;
  const partySize = clampParty(req.body.partySize);

  if (!poolId || !date || !startTime || !planTypeId || !categoryId) {
    const err = new Error('poolId, date, startTime, planTypeId and categoryId are required');
    err.status = 400; throw err;
  }
  if (!healthConfirmed) {
    const err = new Error('Please confirm the health & eligibility declaration before booking');
    err.status = 400; throw err;
  }
  if (!isWithinBookingWindow(date)) {
    const err = new Error(`Bookings are only open for today through the next ${MAX_ADVANCE_DAYS} days`);
    err.status = 400; throw err;
  }

  const config = await getOrCreateConfig(ground._id);
  const pool = config.pools.id(poolId);
  if (!pool || !pool.isActive) { const err = new Error('This pool is not available for booking'); err.status = 404; throw err; }

  const block = findEffectiveBlock(pool, date, startTime);
  if (!block) { const err = new Error('This slot is not open for booking'); err.status = 400; throw err; }

  if (isSlotExpired(date, startTime)) {
    const err = new Error('This slot has already started and can no longer be booked');
    err.status = 400; throw err;
  }

  const planType = config.planTypes.id(planTypeId);
  if (!planType || !planType.isActive) { const err = new Error('Please pick a valid plan'); err.status = 400; throw err; }
  const category = planType.categories.id(categoryId);
  // A category only ever belongs to the plan type it was created under, so
  // this single lookup is also what keeps an invalid plan/category pairing
  // from ever reaching the price calculation below.
  if (!category || !category.isActive) { const err = new Error('Please pick a valid category'); err.status = 400; throw err; }

  const alreadyRegistered = req.user.poolRegistrations?.some((id) => String(id) === String(ground._id));
  const applyRegistration = !!includeRegistration && !alreadyRegistered && config.registrationFee > 0;

  const used = await dailyHeadcountUsed(req.user._id, ground._id, date);
  if (used + partySize > MAX_DAILY_HEADCOUNT) {
    const err = new Error(`You can only reserve up to ${MAX_DAILY_HEADCOUNT} spots per day at this pool — you've already got ${used} for ${date}`);
    err.status = 400; throw err;
  }

  const totalAmount = category.price * partySize + (applyRegistration ? config.registrationFee : 0);
  if (totalAmount <= 0) { const err = new Error('Invalid amount for this plan — please contact the venue'); err.status = 400; throw err; }

  const priceInfo = splitAmount(ground, totalAmount, 1); // pool = full payment upfront, no advance/final split

  return { config, pool, block, planType, category, partySize, applyRegistration, priceInfo, date, startTime };
};

const createPoolOrder = asyncHandler(async (req, res) => {
  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(error.status); throw new Error(error.message); }

  let ctx;
  try {
    ctx = await resolveBookingContext(ground, req);
  } catch (err) {
    res.status(err.status || 400); throw err;
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: ctx.priceInfo.totalAmount * 100,
    currency: 'INR',
    receipt: `pool_${Date.now()}`,
    notes: {
      groundId: ground._id.toString(), poolId: ctx.pool._id.toString(),
      date: ctx.date, startTime: ctx.startTime, playerId: req.user._id.toString(), type: 'pool_full',
    },
  });

  res.json({
    orderId: order.id,
    amount: ctx.priceInfo.totalAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    ground: { name: ground.name, address: ground.address },
    pool: { name: ctx.pool.name },
    slot: { date: ctx.date, startTime: ctx.startTime, endTime: ctx.block.endTime, category: ctx.block.category },
    planType: { name: ctx.planType.name, billingLabel: ctx.planType.billingLabel },
    category: { name: ctx.category.name, price: ctx.category.price },
    partySize: ctx.partySize,
    includesRegistration: ctx.applyRegistration,
    // Deliberately no commissionPercent/platformCommission/ownerPayout —
    // internal business data, same as the ground payment flow.
  });
});

const verifyPoolPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, medicalCertificateUrl } = req.body;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  if (expectedSignature !== razorpaySignature) { res.status(400); throw new Error('Payment verification failed'); }

  const { ground, error } = await loadLiveBookablePool(req.params.groundId);
  if (error) { res.status(error.status); throw new Error(error.message); }

  let ctx;
  try {
    ctx = await resolveBookingContext(ground, req);
  } catch (err) {
    // Payment already succeeded on Razorpay's side but something about the
    // booking is no longer valid (slot removed, daily cap hit meanwhile,
    // plan disabled) — don't silently eat the money.
    res.status(409);
    throw new Error(`${err.message} Your payment was captured — please contact support for a refund.`);
  }

  const claimed = await claimPoolSlotCapacity({
    groundId: ground._id,
    poolId: ctx.pool._id,
    date: ctx.date,
    startTime: ctx.startTime,
    endTime: ctx.block.endTime,
    capacity: ctx.block.capacity,
    userId: req.user._id,
    partySize: ctx.partySize,
  });

  if (!claimed) {
    res.status(409);
    throw new Error('This slot was just filled by someone else. Your payment was captured — please contact support for a refund.');
  }

  const ticketId = generateTicketId();
  const certUrl = medicalCertificateUrl || req.user.medicalCertificateUrl || '';

  const booking = await Booking.create({
    player: req.user._id,
    ground: ground._id,
    slot: claimed._id,
    sportId: null,
    sportName: 'Swimming',
    courtId: null,
    courtName: '',
    poolId: ctx.pool._id,
    poolName: ctx.pool.name,
    slotCategory: ctx.block.category,
    planTypeName: ctx.planType.name,
    categoryName: ctx.category.name,
    billingLabel: ctx.planType.billingLabel,
    includedRegistrationFee: ctx.applyRegistration,
    healthConfirmed: true,
    medicalCertificateUrl: certUrl,
    ticketId,
    partySize: ctx.partySize,
    date: ctx.date,
    startTime: ctx.startTime,
    endTime: ctx.block.endTime,
    totalPrice: ctx.priceInfo.totalAmount,
    advancePrice: ctx.priceInfo.advanceAmount,
    remainingPrice: ctx.priceInfo.remainingAmount,
    commissionPercent: ctx.priceInfo.commissionPercent,
    platformCommission: ctx.priceInfo.platformCommission,
    ownerPayout: ctx.priceInfo.ownerPayout,
    status: 'completed',
  });

  const payment = await Payment.create({
    booking: booking._id,
    player: req.user._id,
    ground: ground._id,
    totalAmount: ctx.priceInfo.totalAmount,
    advanceAmount: ctx.priceInfo.advanceAmount,
    remainingAmount: ctx.priceInfo.remainingAmount,
    commissionPercent: ctx.priceInfo.commissionPercent,
    platformCommission: ctx.priceInfo.platformCommission,
    ownerPayout: ctx.priceInfo.ownerPayout,
    advancePayment: { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() },
    finalPayment: { status: 'not_due' },
    status: 'completed',
  });

  booking.payment = payment._id;
  await booking.save();

  const userUpdate = {};
  if (ctx.applyRegistration) userUpdate.$addToSet = { poolRegistrations: ground._id, bookedDays: ctx.date };
  else userUpdate.$addToSet = { bookedDays: ctx.date };
  if (medicalCertificateUrl && medicalCertificateUrl !== req.user.medicalCertificateUrl) {
    userUpdate.$set = { medicalCertificateUrl };
  }
  await User.findByIdAndUpdate(req.user._id, userUpdate);

  sendPoolBookingEmail(req.user, ground, booking).catch(() => {});
  notifyPoolBookingConfirmed({ groundId: ground._id, groundName: ground.name, userId: req.user._id, ticketId, date: ctx.date, startTime: ctx.startTime });
  notifySlotBooked({ ownerId: ground.owner, actorId: req.user._id, groundId: ground._id, groundName: ground.name, date: ctx.date, startTime: ctx.startTime, endTime: ctx.block.endTime });

  res.json({
    message: 'Payment successful — your pool session is booked. Your ticket has been emailed to you.',
    booking: sanitizeBookingForPlayer(booking),
    ticketId,
  });
});

// ── Admin-only cancellation (payment-issue path — no self-serve cancel) ──

const adminCancelPoolBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate('payment');
  if (!booking || !booking.poolId) { res.status(404); throw new Error('Pool booking not found'); }
  if (['cancelled', 'refunded'].includes(booking.status)) { res.status(400); throw new Error('Already cancelled'); }

  const payment = booking.payment ? await Payment.findById(booking.payment._id) : null;
  if (payment?.advancePayment?.razorpayPaymentId) {
    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(payment.advancePayment.razorpayPaymentId, {
      amount: payment.totalAmount * 100,
    });
    payment.refund = { razorpayRefundId: refund.id, amount: payment.totalAmount, status: 'processed', processedAt: new Date() };
    payment.status = 'refunded';
    await payment.save();
  }

  await releasePoolSlotCapacity({
    groundId: booking.ground,
    poolId: booking.poolId,
    date: booking.date,
    startTime: booking.startTime,
    userId: booking.player,
    partySize: booking.partySize || 1,
  });

  booking.status = 'refunded';
  await booking.save();

  res.json({ message: 'Pool booking cancelled & refunded ✅' });
});

export { getPoolAvailability, getPoolPlans, createPoolOrder, verifyPoolPayment, adminCancelPoolBooking };
