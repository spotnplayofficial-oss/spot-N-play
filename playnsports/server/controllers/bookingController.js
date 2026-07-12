import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Ground from '../models/Ground.js';
import User from '../models/User.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';
import { notifySlotBooked } from '../services/notificationService.js';

const todayStr = () => new Date().toISOString().split('T')[0];

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ player: req.user._id })
    .populate('ground', 'name address sport pricePerHour')
    .sort({ createdAt: -1 });

  const today = new Date();
  today.setHours(0,0,0,0);

  const activeBookings = bookings.filter(b => {
    if (['cancelled', 'refunded', 'pending'].includes(b.status)) return false;
    
    // Check if date has passed
    const bDate = new Date(b.date + 'T00:00:00');
    bDate.setHours(0,0,0,0);
    return bDate.getTime() >= today.getTime();
  });

  res.json(activeBookings);
});

const getGroundBookings = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  const bookings = await Booking.find({ ground: req.params.id })
    .populate('player', 'name phone hidePhoneNumber')
    .sort({ createdAt: -1 });
  res.json(scrubNestedPhone(bookings, 'player', req.user._id));
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, player: req.user._id });
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found or unauthorized');
  }

  const ground = await Ground.findById(booking.ground);
  const slot = ground.slots.id(booking.slot);
  if (slot) {
    slot.isBooked = false;
    slot.bookedBy = null;
    await ground.save();
  }

  booking.status = 'cancelled';
  await booking.save();

  res.json({ message: 'Booking cancelled successfully' });
});

const bookGroundSlot = asyncHandler(async (req, res) => {
  const { slotId } = req.body;

  const groundCheck = await Ground.findById(req.params.id).select('isSocial owner name');
  if (!groundCheck) {
    res.status(404);
    throw new Error('Ground not found');
  }
  if (!groundCheck.isSocial) {
    res.status(400);
    throw new Error('This ground requires payment to book');
  }

  // Atomic claim: only succeeds if the slot is STILL unbooked at the moment
  // Mongo applies this update. If two people tap the same slot at the same
  // instant, only one findOneAndUpdate call can match+flip it — the loser
  // gets `null` back and a clean "already booked" error instead of both
  // ending up with a "confirmed" booking for the same slot.
  const ground = await Ground.findOneAndUpdate(
    { _id: req.params.id, slots: { $elemMatch: { _id: slotId, isBooked: false, date: { $gte: todayStr() } } } },
    { $set: { 'slots.$.isBooked': true, 'slots.$.bookedBy': req.user._id } },
    { new: true }
  );

  if (!ground) {
    // Either the slot doesn't exist, someone else just booked it, or it's
    // a stale slot from a past date that was never cleaned up.
    const exists = await Ground.exists({ _id: req.params.id, 'slots._id': slotId });
    res.status(exists ? 400 : 404);
    throw new Error(exists ? 'This slot is no longer bookable (already booked or in the past)' : 'Slot not found');
  }

  const slot = ground.slots.id(slotId);

  const booking = await Booking.create({
    player: req.user._id,
    ground: ground._id,
    slot: slot._id,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    totalPrice: 0,
    advancePrice: 0,
    remainingPrice: 0,
    status: 'completed'
  });

  // mark booking day on user
  const bDate = slot.date; // already 'YYYY-MM-DD'
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { bookedDays: bDate }
  });

  notifySlotBooked({
    ownerId: ground.owner,
    actorId: req.user._id,
    groundId: ground._id,
    groundName: ground.name,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  });

  res.status(201).json(booking);
});

const bookSocialGroundSlot = asyncHandler(async (req, res) => {
  const { date, startTime, endTime } = req.body;
  const ground = await Ground.findById(req.params.id);

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found');
  }

  if (!ground.isSocial) {
    res.status(400);
    throw new Error('This ground is not a social ground');
  }

  // Validate date is within the next 7 days (today through today+6)
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const maxObj = new Date(todayObj);
  maxObj.setDate(maxObj.getDate() + 6);

  const reqDateObj = new Date(date + 'T00:00:00');
  reqDateObj.setHours(0, 0, 0, 0);

  if (reqDateObj.getTime() < todayObj.getTime() || reqDateObj.getTime() > maxObj.getTime()) {
    res.status(400);
    throw new Error('Booking only allowed within the next 7 days');
  }

  // Validate time between 09:00 and 19:00, valid duration, and max 1 hour length
  const t2m = (t) => { const [h, m] = t.split(':'); return parseInt(h)*60 + parseInt(m); };
  
  const startMins = t2m(startTime);
  const endMins = t2m(endTime);

  if (startMins < 9*60 || endMins > 19*60 || startMins >= endMins) {
    res.status(400);
    throw new Error('Time must be between 09:00 and 19:00, with a valid duration');
  }

  if (endMins - startMins > 60) {
    res.status(400);
    throw new Error('You can only book a maximum of 1 hour per slot');
  }

  // Removed 2-hour constraint

  // Check if player has booked today; enforce non-consecutive rule
  const existingUserBookings = await Booking.find({
    player: req.user._id,
    date: date,
    status: { $ne: 'cancelled' }
  });

  for (const b of existingUserBookings) {
    const eStart = t2m(b.startTime);
    if (Math.abs(startMins - eStart) === 0) {
      res.status(400);
      throw new Error('You have already booked this slot!');
    }
    // If the diff between starts is exactly 60 or less, they are consecutive or overlapping
    if (Math.abs(startMins - eStart) <= 60) {
      res.status(400);
      throw new Error('You cannot book consecutive slots. Please leave at least a 1-hour gap between bookings.');
    }
  }

  // Check overlap against ALL existing booked slots for this date
  const existingSlots = ground.slots.filter(s => s.date === date && s.isBooked);
  for (const s of existingSlots) {
    const eStart = t2m(s.startTime);
    const eEnd = t2m(s.endTime);
    if (startMins < eEnd && endMins > eStart) {
      res.status(400);
      throw new Error('Slot already booked');
    }
  }

  // Atomically push the new flexible slot ONLY if no already-booked slot on
  // this date still overlaps it at the moment of the write (string HH:mm
  // comparison works fine since times are always zero-padded 24h). This
  // closes the same race as bookGroundSlot: two players submitting
  // overlapping custom times within milliseconds of each other can no
  // longer both succeed — the second write's guard condition simply won't
  // match anymore once the first has landed.
  const updatedGround = await Ground.findOneAndUpdate(
    {
      _id: ground._id,
      slots: {
        $not: {
          $elemMatch: { date, isBooked: true, startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        },
      },
    },
    { $push: { slots: { date, startTime, endTime, isBooked: false, bookedBy: null } } },
    { new: true }
  );

  if (!updatedGround) {
    res.status(400);
    throw new Error('Slot already booked');
  }

  const newSlot = updatedGround.slots[updatedGround.slots.length - 1];

  const booking = await Booking.create({
    player: req.user._id,
    ground: updatedGround._id,
    slot: newSlot._id,
    date,
    startTime,
    endTime,
    totalPrice: 0,
    advancePrice: 0,
    remainingPrice: 0,
    status: 'pending_approval'
  });
  // mark booking day on user
    const bDate = date; // already 'YYYY-MM-DD'
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { bookedDays: bDate }
    });

  notifySlotBooked({
    ownerId: updatedGround.owner,
    actorId: req.user._id,
    groundId: updatedGround._id,
    groundName: updatedGround.name,
    date,
    startTime,
    endTime,
    pendingApproval: true,
  });

  res.status(201).json(booking);
});

export { getMyBookings, getGroundBookings, cancelBooking, bookGroundSlot, bookSocialGroundSlot };