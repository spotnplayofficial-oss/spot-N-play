import asyncHandler from 'express-async-handler';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import Ground from '../models/Ground.js';
import Event from '../models/Event.js';

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured in environment variables');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// ── Ground Booking Payments ─────────────────────────────────

const createAdvanceOrder = asyncHandler(async (req, res) => {
  const { slotId } = req.body;

  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }

  const slot = ground.slots.id(slotId);
  if (!slot) { res.status(404); throw new Error('Slot not found'); }
  if (slot.isBooked) { res.status(400); throw new Error('Slot already booked'); }

  const existingUserBookings = await Booking.find({
    player: req.user._id,
    date: slot.date,
    status: { $nin: ['cancelled', 'refunded'] },
  });

  const t2m = (t) => { const [h, m] = t.split(':'); return parseInt(h) * 60 + parseInt(m); };
  const startMins = t2m(slot.startTime);

  for (const b of existingUserBookings) {
    const eStart = t2m(b.startTime);
    if (Math.abs(startMins - eStart) === 0) {
      res.status(400); throw new Error('You have already booked this slot!');
    }
    if (Math.abs(startMins - eStart) <= 60) {
      res.status(400); throw new Error('You cannot book consecutive slots. Please leave at least a 1-hour gap between bookings.');
    }
  }

  const totalAmount = ground.pricePerHour;
  const advanceAmount = Math.round(totalAmount * 0.3);
  const remainingAmount = totalAmount - advanceAmount;

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: advanceAmount * 100,
    currency: 'INR',
    receipt: `adv_${Date.now()}`,
    notes: { groundId: ground._id.toString(), slotId, playerId: req.user._id.toString(), type: 'advance' },
  });

  res.json({
    orderId: order.id,
    amount: advanceAmount,
    totalAmount,
    remainingAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    ground: { name: ground.name, address: ground.address },
    slot: { date: slot.date, startTime: slot.startTime, endTime: slot.endTime },
  });
});

const verifyAdvancePayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, slotId } = req.body;

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400); throw new Error('Payment verification failed');
  }

  const ground = await Ground.findById(req.params.id);
  const slot = ground.slots.id(slotId);

  if (slot.isBooked) { res.status(400); throw new Error('Slot already booked'); }

  slot.isBooked = true;
  slot.bookedBy = req.user._id;
  await ground.save();

  const totalAmount = ground.pricePerHour;
  const advanceAmount = Math.round(totalAmount * 0.3);
  const remainingAmount = totalAmount - advanceAmount;

  const booking = await Booking.create({
    player: req.user._id,
    ground: ground._id,
    slot: slot._id,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    totalPrice: totalAmount,
    advancePrice: advanceAmount,
    remainingPrice: remainingAmount,
    status: 'advance_paid',
  });

  const payment = await Payment.create({
    booking: booking._id,
    player: req.user._id,
    ground: ground._id,
    totalAmount,
    advanceAmount,
    remainingAmount,
    advancePayment: { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() },
    finalPayment: { status: 'pending' },
    status: 'advance_paid',
  });

  booking.payment = payment._id;
  await booking.save();

  res.json({ message: 'Advance payment successful ✅', booking, payment });
});

const createFinalOrder = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, player: req.user._id }).populate('payment');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }
  if (booking.status !== 'advance_paid') { res.status(400); throw new Error('Final payment not due'); }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: booking.remainingPrice * 100,
    currency: 'INR',
    receipt: `final_${Date.now()}`,
    notes: { bookingId: booking._id.toString(), playerId: req.user._id.toString(), type: 'final' },
  });

  res.json({ orderId: order.id, amount: booking.remainingPrice, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID, booking });
});

const verifyFinalPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400); throw new Error('Payment verification failed');
  }

  const booking = await Booking.findById(req.params.id).populate('payment');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }

  booking.status = 'completed';
  await booking.save();

  const payment = await Payment.findById(booking.payment._id);
  payment.finalPayment = { razorpayOrderId, razorpayPaymentId, status: 'paid', paidAt: new Date() };
  payment.status = 'completed';
  await payment.save();

  res.json({ message: 'Final payment successful ✅ Booking completed!', booking, payment });
});

const cancelAndRefund = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, player: req.user._id }).populate('payment');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }
  if (!['advance_paid', 'advance_pending'].includes(booking.status)) {
    res.status(400); throw new Error('Cannot cancel this booking');
  }

  const payment = await Payment.findById(booking.payment);
  if (payment?.advancePayment?.razorpayPaymentId) {
    const razorpay = getRazorpay();
    const refund = await razorpay.payments.refund(payment.advancePayment.razorpayPaymentId, {
      amount: payment.advanceAmount * 100,
    });
    payment.refund = { razorpayRefundId: refund.id, amount: payment.advanceAmount, status: 'processed', processedAt: new Date() };
    payment.status = 'refunded';
    await payment.save();
  }

  const ground = await Ground.findById(booking.ground);
  const slot = ground.slots.id(booking.slot);
  if (slot) { slot.isBooked = false; slot.bookedBy = null; await ground.save(); }

  booking.status = 'refunded';
  await booking.save();

  res.json({ message: 'Booking cancelled & advance refunded ✅' });
});

const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ player: req.user._id })
    .populate('ground', 'name address sport')
    .populate('booking')
    .sort({ createdAt: -1 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activePayments = payments.filter((p) => {
    if (['cancelled', 'refunded'].includes(p.status)) return false;
    if (!p.booking) return false;
    const bDate = new Date(p.booking.date + 'T00:00:00');
    bDate.setHours(0, 0, 0, 0);
    return bDate.getTime() >= today.getTime();
  });

  res.json(activePayments);
});

// ── Event Payments ──────────────────────────────────────────
// NOTE: Event payments do NOT create a Payment document.
// Payment info is stored directly on Event.participants (razorpayOrderId, razorpayPaymentId, amountPaid).

const assertEventJoinable = (event, userId) => {
  if (event.approvalStatus !== 'approved') throw new Error('This event is not open yet');
  if (event.status !== 'upcoming') throw new Error('This event is no longer accepting participants');
  if (event.organizer.toString() === userId.toString()) throw new Error('You cannot join your own event');
  const already = event.participants.find((p) => p.user.toString() === userId.toString());
  if (already) throw new Error('You have already joined this event');
  if (event.maxParticipants > 0 && event.participants.length >= event.maxParticipants) throw new Error('This event is full');
};

const createEventOrder = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  if (event.eventType !== 'paid') {
    res.status(400); throw new Error('This event is free — join directly, no payment needed');
  }

  try {
    assertEventJoinable(event, req.user._id);
  } catch (err) {
    res.status(400); throw err;
  }

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: event.price * 100,
    currency: 'INR',
    receipt: `event_${event._id}_${Date.now()}`,
    notes: { eventId: event._id.toString(), userId: req.user._id.toString(), type: 'event_join' },
  });

  res.json({
    orderId: order.id,
    amount: event.price,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    event: { _id: event._id, title: event.title },
  });
});

const verifyEventPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    res.status(400); throw new Error('Missing payment verification fields');
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400); throw new Error('Payment verification failed — signature mismatch');
  }

  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  try {
    assertEventJoinable(event, req.user._id);
  } catch (err) {
    res.status(400); throw err;
  }

  event.participants.push({
    user: req.user._id,
    paymentStatus: 'paid',
    amountPaid: event.price,
    razorpayOrderId,
    razorpayPaymentId,
  });
  await event.save();

  res.json({ message: 'Payment successful — you joined the event 🎉', event });
});

export {
  createAdvanceOrder,
  verifyAdvancePayment,
  createFinalOrder,
  verifyFinalPayment,
  cancelAndRefund,
  getMyPayments,
  createEventOrder,
  verifyEventPayment,
};