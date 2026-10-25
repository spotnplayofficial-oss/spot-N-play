import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Ground from '../models/Ground.js';
import User from '../models/User.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';
import { notify, notifySlotBooked, notifyTeamUpRequest } from '../services/notificationService.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { claimSlotCapacity, releaseSlotCapacity, sportForSlot, sanitizeBookingForPlayer } from '../utils/bookingEngine.js';

const todayStr = () => new Date().toISOString().split('T')[0];

const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ player: req.user._id })
    .populate('ground', 'name address sport venueType pricePerHour')
    .sort({ createdAt: -1 });

  res.json(bookings.map(sanitizeBookingForPlayer));
});

const maskTicketId = (tid) => {
  if (!tid || tid.length < 8) return tid;
  return tid.slice(0, 4) + '****' + tid.slice(-4);
};

const getGroundBookings = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }

  const isOwner = String(ground.owner) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const bookings = await Booking.find({ ground: req.params.id })
    .populate('player', 'name phone hidePhoneNumber')
    .sort({ createdAt: -1 });
  const scrubbed = scrubNestedPhone(bookings, 'player', req.user._id);
  // pool tickets are sensitive — owners see masked version, admin sees full
  if (!isAdmin) {
    const masked = scrubbed.map((b) => {
      const obj = b.toObject ? b.toObject() : b;
      if (obj.ticketId) obj.ticketId = maskTicketId(obj.ticketId);
      return obj;
    });
    return res.json(masked);
  }
  res.json(scrubbed);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, player: req.user._id });
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found or unauthorized');
  }

  // Pool bookings are full-payment-upfront and only cancelled/refunded by
  // an admin in case of a payment issue — never self-serve. Blocking this
  // here (not just in the UI) is what actually closes the loophole: a
  // player could otherwise hit this generic endpoint directly and get
  // marked 'cancelled' while keeping the money and the reserved capacity
  // both stuck, since this path has no pool-aware release or refund logic.
  if (booking.poolId) {
    res.status(400);
    throw new Error('Pool bookings can\'t be self-cancelled — please contact support if there was a payment issue.');
  }

  await releaseSlotCapacity({
    groundId: booking.ground,
    slotId: booking.slot,
    userId: req.user._id,
    partySize: booking.partySize || 1,
  });

  booking.status = 'cancelled';
  await booking.save();

  res.json({ message: 'Booking cancelled successfully' });
});

// Instant free booking — only for isSocial grounds (no real money involved,
// so no capacity-race concern beyond the atomic claim itself).
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

  const claimed = await claimSlotCapacity({ groundId: req.params.id, slotId, userId: req.user._id, partySize: 1 });

  if (!claimed) {
    const exists = await Ground.exists({ _id: req.params.id, 'slots._id': slotId });
    res.status(exists ? 400 : 404);
    throw new Error(exists ? 'This slot is no longer bookable (already booked or in the past)' : 'Slot not found');
  }

  const { ground, slot } = claimed;
  const sportDoc = sportForSlot(ground, slot);

  const booking = await Booking.create({
    player: req.user._id,
    ground: ground._id,
    slot: slot._id,
    sportId: slot.sportId,
    sportName: sportDoc?.name || '',
    courtId: slot.courtId,
    courtName: slot.courtId ? sportDoc?.courts?.id(slot.courtId)?.name || '' : '',
    partySize: 1,
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
  const { date, dates, startTime, endTime, partySize = 1 } = req.body;
  const ground = await Ground.findById(req.params.id);

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found');
  }

  if (!ground.isSocial) {
    res.status(400);
    throw new Error('This ground is not a social ground');
  }

  const sportDoc = ground.sports[0];
  if (!sportDoc) {
    res.status(400);
    throw new Error('This ground has no sport configured yet');
  }

  // Handle single date or array of dates (min 1, max 2: Today and/or Tomorrow)
  const targetDates = Array.isArray(dates) && dates.length > 0 ? dates : (date ? [date] : []);
  if (targetDates.length === 0 || targetDates.length > 2) {
    res.status(400);
    throw new Error('You can book minimum 1 day and maximum 2 days (Today & Tomorrow)');
  }

  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const tomorrowObj = new Date(todayObj);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);

  // Validate time between 09:00 and 19:30, valid duration, and max 1 hour length
  const t2m = (t) => { const [h, m] = t.split(':'); return parseInt(h, 10)*60 + parseInt(m, 10); };
  
  const startMins = t2m(startTime);
  const endMins = t2m(endTime);

  if (startMins < 9*60 || endMins > 20*60 || startMins >= endMins) {
    res.status(400);
    throw new Error('Time must be between 09:00 AM and 08:00 PM (Latest start: 07:00 PM), with a valid duration');
  }

  if (endMins - startMins > 60) {
    res.status(400);
    throw new Error('You can only book a maximum of 1 hour per session');
  }

  const validPartySize = Math.max(1, Math.min(4, Number(partySize) || 1));
  const createdBookings = [];

  for (const d of targetDates) {
    const reqDateObj = new Date(d + 'T00:00:00');
    reqDateObj.setHours(0, 0, 0, 0);

    if (reqDateObj.getTime() < todayObj.getTime() || reqDateObj.getTime() > tomorrowObj.getTime()) {
      res.status(400);
      throw new Error(`Booking only allowed for Today and Tomorrow. Invalid date: ${d}`);
    }

    // Check if player has booked this day; enforce non-consecutive rule
    const existingUserBookings = await Booking.find({
      player: req.user._id,
      date: d,
      status: { $ne: 'cancelled' }
    });

    for (const b of existingUserBookings) {
      const eStart = t2m(b.startTime);
      if (Math.abs(startMins - eStart) === 0) {
        res.status(400);
        throw new Error(`You have already booked this slot on ${d}!`);
      }
      if (Math.abs(startMins - eStart) <= 60) {
        res.status(400);
        throw new Error(`You cannot book consecutive slots on ${d}. Please leave at least a 1-hour gap between bookings.`);
      }
    }

    // Check overlap against ALL existing booked slots for this date
    const existingSlots = ground.slots.filter(s => s.date === d && s.isBooked);
    for (const s of existingSlots) {
      const eStart = t2m(s.startTime);
      const eEnd = t2m(s.endTime);
      if (startMins < eEnd && endMins > eStart) {
        res.status(400);
        throw new Error(`Slot ${startTime} - ${endTime} is already booked on ${d}`);
      }
    }

    // Atomically push the slot
    const updatedGround = await Ground.findOneAndUpdate(
      {
        _id: ground._id,
        slots: {
          $not: {
            $elemMatch: { date: d, isBooked: true, startTime: { $lt: endTime }, endTime: { $gt: startTime } },
          },
        },
      },
      { $push: { slots: {
        sportId: sportDoc._id,
        courtId: null,
        date: d, startTime, endTime,
        capacity: validPartySize,
        bookedCount: validPartySize,
        bookedBy: [req.user._id],
        isBooked: true,
      } } },
      { new: true }
    );

    if (!updatedGround) {
      res.status(400);
      throw new Error(`Slot ${startTime} - ${endTime} was just taken on ${d}`);
    }

    const newSlot = updatedGround.slots[updatedGround.slots.length - 1];

    const booking = await Booking.create({
      player: req.user._id,
      ground: updatedGround._id,
      slot: newSlot._id,
      sportId: sportDoc._id,
      sportName: sportDoc.name,
      partySize: validPartySize,
      date: d,
      startTime,
      endTime,
      totalPrice: 0,
      advancePrice: 0,
      remainingPrice: 0,
      status: 'pending_approval'
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { bookedDays: d }
    });

    notifySlotBooked({
      ownerId: updatedGround.owner,
      actorId: req.user._id,
      groundId: updatedGround._id,
      groundName: updatedGround.name,
      date: d,
      startTime,
      endTime,
      pendingApproval: true,
    });

    createdBookings.push(booking);
  }

  res.status(201).json(createdBookings.length === 1 ? createdBookings[0] : createdBookings);
});

const extendSocialBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('ground');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (String(booking.player) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to extend this booking');
  }

  if (!booking.ground?.isSocial) {
    res.status(400);
    throw new Error('Booking extension is only available for social grounds');
  }

  if (booking.isExtended) {
    res.status(400);
    throw new Error('This booking has already been extended');
  }

  // 1 hour cooldown requirement from createdAt
  const cooldownMs = 60 * 60 * 1000;
  const timeSinceBooking = Date.now() - new Date(booking.createdAt).getTime();
  if (timeSinceBooking < cooldownMs) {
    const remainingMins = Math.ceil((cooldownMs - timeSinceBooking) / (60 * 1000));
    res.status(400);
    throw new Error(`Extension cooldown active. Please wait ${remainingMins} minute(s) before extending.`);
  }

  // Calculate new endTime: +1 hour (60 minutes)
  const t2m = (t) => { const [h, m] = t.split(':'); return parseInt(h, 10)*60 + parseInt(m, 10); };
  const m2t = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const currentEndMins = t2m(booking.endTime);
  const newEndMins = currentEndMins + 60;

  if (newEndMins > 20 * 60) {
    res.status(400);
    throw new Error('Cannot extend booking beyond 08:00 PM');
  }

  const newEndTime = m2t(newEndMins);

  // Check if extending overlaps with another booked slot on that ground for that date
  const ground = await Ground.findById(booking.ground._id);
  const overlapping = ground.slots.some(s => 
    s.date === booking.date &&
    s.isBooked &&
    String(s._id) !== String(booking.slot) &&
    currentEndMins < t2m(s.endTime) &&
    newEndMins > t2m(s.startTime)
  );

  if (overlapping) {
    res.status(400);
    throw new Error('Cannot extend booking: The subsequent hour is already booked by another player.');
  }

  // Update ground slot endTime
  await Ground.updateOne(
    { _id: ground._id, 'slots._id': booking.slot },
    { $set: { 'slots.$.endTime': newEndTime } }
  );

  booking.endTime = newEndTime;
  booking.isExtended = true;
  booking.extendedAt = new Date();
  await booking.save();

  res.json({
    success: true,
    message: `Booking successfully extended to ${newEndTime}!`,
    booking
  });
});

const getTeamUpBookings = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const groundId = req.params.id;

  const filter = {
    ground: groundId,
    status: { $in: ['pending_approval', 'completed', 'confirmed'] }
  };

  if (date) {
    filter.date = date;
  }

  // Exclude current player's own bookings
  if (req.user?._id) {
    filter.player = { $ne: req.user._id };
  }

  const bookings = await Booking.find(filter)
    .populate('player', 'name email phone avatar profileImage skillLevel')
    .sort({ date: 1, startTime: 1 });

  // Filter for odd-numbered bookings (1 player or 3 players)
  const oddBookings = bookings.filter(b => {
    const size = b.partySize || 1;
    return size % 2 !== 0;
  });

  res.json(oddBookings);
});

const sendTeamUpRequest = asyncHandler(async (req, res) => {
  const { bookingId, slotId, date, startTime, endTime, note } = req.body;
  const groundId = req.params.id;

  let targetBooking = null;

  if (bookingId) {
    targetBooking = await Booking.findById(bookingId).populate('player').populate('ground');
  }

  // If bookingId wasn't provided directly, search by ground + date + time
  if (!targetBooking && (slotId || (date && startTime))) {
    const query = {
      ground: groundId,
      status: { $in: ['pending_approval', 'advance_pending', 'advance_paid', 'final_pending', 'completed', 'confirmed'] },
    };
    if (date) query.date = date;
    if (slotId) {
      query.slot = slotId;
    } else if (startTime && endTime) {
      query.startTime = startTime;
      query.endTime = endTime;
    }

    targetBooking = await Booking.findOne(query).populate('player').populate('ground');

    // If still not found by exact match, search for overlapping time on that date
    if (!targetBooking && date && startTime && endTime) {
      const candidates = await Booking.find({
        ground: groundId,
        date,
        status: { $in: ['pending_approval', 'advance_pending', 'advance_paid', 'final_pending', 'completed', 'confirmed'] },
      }).populate('player').populate('ground');

      targetBooking = candidates.find((b) => {
        return startTime < b.endTime && endTime > b.startTime;
      });
    }
  }

  // If still not found, check ground.slots to see if slot was marked booked
  if (!targetBooking && groundId && (slotId || (date && startTime))) {
    const ground = await Ground.findById(groundId);
    if (ground?.slots) {
      const slotDoc = ground.slots.find((s) => {
        if (slotId && String(s._id) === String(slotId)) return true;
        return s.date === date && s.startTime === startTime;
      });
      if (slotDoc && slotDoc.bookedBy?.length > 0) {
        const bookedUserId = slotDoc.bookedBy[0];
        targetBooking = await Booking.findOne({
          ground: groundId,
          player: bookedUserId,
          date: slotDoc.date,
          startTime: slotDoc.startTime,
        }).populate('player').populate('ground');
      }
    }
  }

  if (!targetBooking) {
    res.status(404);
    throw new Error('Could not find active booking for this time slot');
  }

  if (String(targetBooking.player?._id || targetBooking.player) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot send a team up request to your own booking');
  }

  // Record the request in teamUpRequests
  targetBooking.teamUpRequests = targetBooking.teamUpRequests || [];
  targetBooking.teamUpRequests.push({
    requester: req.user._id,
    note: note || '',
    status: 'pending',
  });
  await targetBooking.save();

  await notifyTeamUpRequest({
    recipientId: targetBooking.player?._id || targetBooking.player,
    actorId: req.user._id,
    actorName: req.user.name || 'A player',
    venueName: targetBooking.ground?.name || 'DSW Badminton',
    date: targetBooking.date || date,
    startTime: targetBooking.startTime || startTime,
    endTime: targetBooking.endTime || endTime,
    note: note || '',
  });

  res.json({
    success: true,
    message: `Team up request sent to ${targetBooking.player?.name || 'the player'}! 🤝`,
    bookingId: targetBooking._id,
  });
});

// Booked user retrieves all incoming team up requests sent for their bookings
const getMyTeamUpRequests = asyncHandler(async (req, res) => {
  const groundId = req.params.id;
  const filter = {
    player: req.user._id,
    'teamUpRequests.0': { $exists: true },
  };
  if (groundId) filter.ground = groundId;

  const bookings = await Booking.find(filter)
    .populate('ground', 'name address sport images')
    .populate('teamUpRequests.requester', 'name email phone avatar profileImage skillLevel')
    .sort({ updatedAt: -1 });

  const requests = [];
  bookings.forEach((b) => {
    (b.teamUpRequests || []).forEach((r) => {
      requests.push({
        _id: r._id,
        bookingId: b._id,
        ground: b.ground,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        requester: r.requester,
        note: r.note,
        status: r.status,
        createdAt: r.createdAt,
        respondedAt: r.respondedAt,
      });
    });
  });

  res.json(requests);
});

// Booked user accepts or declines a team up request
const respondToTeamUpRequest = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'accept' | 'decline'
  const { requestId } = req.params;

  if (!['accept', 'decline'].includes(action)) {
    res.status(400);
    throw new Error("Action must be either 'accept' or 'decline'");
  }

  const booking = await Booking.findOne({
    player: req.user._id,
    'teamUpRequests._id': requestId,
  }).populate('ground').populate('teamUpRequests.requester', 'name email phone');

  if (!booking) {
    res.status(404);
    throw new Error('Team up request not found or unauthorized');
  }

  const reqDoc = booking.teamUpRequests.id(requestId);
  if (!reqDoc) {
    res.status(404);
    throw new Error('Request not found');
  }

  reqDoc.status = action === 'accept' ? 'accepted' : 'declined';
  reqDoc.respondedAt = new Date();

  await booking.save();

  // If accepted, notify the requester so they can see confirmation
  if (action === 'accept' && reqDoc.requester?._id) {
    await notify({
      recipient: reqDoc.requester._id,
      actor: req.user._id,
      type: NOTIFICATION_TYPES.TEAM_UP_REQUEST,
      title: `🤝 Team Up Accepted by ${req.user.name}!`,
      body: `Great news! ${req.user.name} accepted your Team Up request for badminton on ${booking.date} (${booking.startTime} - ${booking.endTime}) at ${booking.ground?.name || 'DSW Badminton'}.`,
      link: `/grounds/${booking.ground?._id || ''}`,
      data: {
        bookingId: booking._id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        contact: req.user.phone || '',
      },
    });
  }

  res.json({
    success: true,
    message: action === 'accept' ? 'Team up request accepted! 🎉' : 'Team up request declined.',
    status: reqDoc.status,
  });
});

export {
  getMyBookings,
  getGroundBookings,
  cancelBooking,
  bookGroundSlot,
  bookSocialGroundSlot,
  extendSocialBooking,
  getTeamUpBookings,
  sendTeamUpRequest,
  getMyTeamUpRequests,
  respondToTeamUpRequest,
};
