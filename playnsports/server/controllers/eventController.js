import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Event from '../models/Event.js';
import { scrubEventPhones, scrubPhoneField } from '../utils/phonePrivacy.js';
import { generateTicketId } from '../utils/ticket.js';
import { sendEventTicketEmail } from '../utils/sendEmail.js';
import { notifyEventTicketIssued, notifyEventCheckedIn } from '../services/notificationService.js';

// Built lazily, per request — NOT at module load time.
// This file gets imported (via eventRoutes.js) before server.js calls
// dotenv.config(), so a top-level `new Razorpay(...)` here would freeze in
// undefined key_id/key_secret for the lifetime of the process, causing every
// event payment to fail authentication with an opaque 500. Building the
// client inside the request handler guarantees process.env is populated.
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured in environment variables');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const todayStr = () => new Date().toISOString().split('T')[0];

// ── Sub-event helpers ────────────────────────────────────────

// Validates + normalizes the raw sub-events array coming from the client
// into objects safe to hand to Event.create()/save(). Throws a plain Error
// with a user-facing message on the first problem found.
const normalizeSubEvents = (rawSubEvents) => {
  if (!Array.isArray(rawSubEvents)) return [];

  return rawSubEvents.map((se, i) => {
    const label = se.title ? `"${se.title}"` : `Sub-event #${i + 1}`;
    if (!se.title || !se.venue || !se.date || !se.startTime || !se.endTime) {
      throw new Error(`${label} is missing a title, venue, date or time`);
    }
    const eventType = se.eventType === 'paid' ? 'paid' : 'free';
    if (eventType === 'paid' && (!se.price || Number(se.price) <= 0)) {
      throw new Error(`${label} needs a valid ticket price (it's marked paid)`);
    }
    const maxTicketsPerBooking = Math.max(1, Number(se.maxTicketsPerBooking) || 1);
    const capacity = Math.max(0, Number(se.capacity) || 0);
    if (capacity > 0 && maxTicketsPerBooking > capacity) {
      throw new Error(`${label}: max tickets per booking can't exceed total capacity`);
    }

    return {
      title: se.title,
      description: se.description || '',
      image: se.image || '',
      gameTitle: se.gameTitle || '',
      platform: se.platform || '',
      matchFormat: se.matchFormat || '',
      prizePool: Math.max(0, Number(se.prizePool) || 0),
      streamUrl: se.streamUrl || '',
      eventType,
      price: eventType === 'paid' ? Number(se.price) : 0,
      venue: se.venue,
      date: se.date,
      startTime: se.startTime,
      endTime: se.endTime,
      capacity,
      maxTicketsPerBooking,
      status: 'upcoming',
      bookings: [],
    };
  });
};

// A container event's own venue/date/time/type/price are derived from its
// earliest upcoming sub-event so the existing "explore" listing, sorting
// and upcoming-date filtering keep working unchanged for these events too.
// Esports containers additionally inherit the earliest sub-event's game /
// platform / format / region (and the largest prize pool) so explore cards,
// game filters and the esports hub see the right game even though the
// parent event itself never had those fields entered directly.
const deriveTopLevelFields = (event) => {
  if (!event.subEvents || event.subEvents.length === 0) return;

  const sorted = [...event.subEvents].sort((a, b) =>
    `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
  );
  const earliest = sorted[0];

  event.venue = event.subEvents.length > 1
    ? `${earliest.venue} +${event.subEvents.length - 1} more`
    : earliest.venue;
  event.date = earliest.date;
  event.startTime = earliest.startTime;
  event.endTime = earliest.endTime;

  const paidSubs = event.subEvents.filter((se) => se.eventType === 'paid');
  event.eventType = paidSubs.length > 0 ? 'paid' : 'free';
  event.price = paidSubs.length > 0 ? Math.min(...paidSubs.map((se) => se.price)) : 0;
  event.maxParticipants = 0; // capacity lives per sub-event, not on the container

  if (event.eventCategory === 'esports') {
    event.gameTitle = event.gameTitle || earliest.gameTitle || '';
    event.platform = event.platform || earliest.platform || '';
    event.matchFormat = event.matchFormat || earliest.matchFormat || '';
    event.serverRegion = event.serverRegion || earliest.serverRegion || '';
    event.prizePool = Math.max(...event.subEvents.map((se) => se.prizePool || 0));
    event.streamUrl = event.streamUrl || earliest.streamUrl || '';
  }
};

// Shapes one sub-event (already a plain object, `bookings` possibly
// populated) for a viewer who is NOT the organizer/admin — counts + "did I
// book" only, no other players' details.
const shapeSubEventForPublic = (se, userId) => {
  const bookings = se.bookings || [];
  const bookedCount = bookings.reduce((sum, b) => sum + (b.quantity || 1), 0);
  const mine = bookings.find((b) => (b.user?._id || b.user)?.toString() === userId.toString());

  return {
    ...se,
    bookings: undefined,
    participantCount: bookedCount,
    spotsLeft: se.capacity > 0 ? Math.max(se.capacity - bookedCount, 0) : null,
    isJoined: !!mine,
    myBooking: mine || null,
  };
};

// Shape an event for users who are NOT the organizer/admin —
// hide other participants' personal info, just expose counts + "did I join".
const shapeForPublic = (eventDoc, userId) => {
  const event = eventDoc.toObject();
  const participants = event.participants || [];

  event.participantCount = participants.length;
  event.spotsLeft = event.maxParticipants > 0
    ? Math.max(event.maxParticipants - participants.length, 0)
    : null;

  const mine = participants.find((p) => p.user?._id?.toString() === userId.toString() || p.user?.toString() === userId.toString());
  event.isJoined = !!mine;
  event.myParticipation = mine || null;

  if (event.organizer) scrubPhoneField(event.organizer, userId, event.organizer._id);

  delete event.participants;

  event.subEvents = (event.subEvents || []).map((se) => shapeSubEventForPublic(se, userId));

  return event;
};

const findSubEvent = (event, subId) => {
  const subEvent = event.subEvents.id(subId);
  if (!subEvent) {
    const err = new Error('Sub-event not found');
    err.status = 404;
    throw err;
  }
  return subEvent;
};

// ── Create ────────────────────────────────────────────────

const createEvent = asyncHandler(async (req, res) => {
  const {
    title, sport, eventCategory, gameTitle, platform, matchFormat, serverRegion,
    prizePool, streamUrl,
    description, eventType, price,
    contactName, contactNumber, venue,
    date, startTime, endTime, maxParticipants, image,
    subEvents: rawSubEvents,
  } = req.body;

  const category = eventCategory === 'esports' ? 'esports' : 'sports';
  const normalizedSport = category === 'esports' ? 'esports' : sport;

  if (!title || !normalizedSport || !contactNumber) {
    res.status(400);
    throw new Error('Please fill all required fields (title, sport, contact number)');
  }

  if (category === 'esports' && !gameTitle) {
    res.status(400);
    throw new Error('Please choose the esports game title');
  }

  let subEvents;
  try {
    subEvents = normalizeSubEvents(rawSubEvents);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const hasSubEvents = subEvents.length > 0;

  if (!hasSubEvents && (!venue || !date || !startTime || !endTime)) {
    res.status(400);
    throw new Error('Please fill all required fields (venue, date, time) or add at least one sub-event');
  }

  const type = eventType === 'paid' ? 'paid' : 'free';
  if (!hasSubEvents && type === 'paid' && (!price || Number(price) <= 0)) {
    res.status(400);
    throw new Error('Please add a valid price for a paid event');
  }

  const event = new Event({
    organizer: req.user._id,
    title,
    sport: normalizedSport,
    eventCategory: category,
    gameTitle: category === 'esports' ? gameTitle : '',
    platform: category === 'esports' ? (platform || '') : '',
    matchFormat: category === 'esports' ? (matchFormat || '') : '',
    serverRegion: category === 'esports' ? (serverRegion || '') : '',
    prizePool: category === 'esports' ? (Math.max(0, Number(prizePool) || 0)) : 0,
    streamUrl: category === 'esports' ? (streamUrl || '') : '',
    description: description || '',
    eventType: type,
    price: type === 'paid' ? Number(price) : 0,
    contactName: contactName || req.user.name,
    contactNumber,
    venue: venue || (category === 'esports' ? 'Online lobby' : ''),
    date: date || '',
    startTime: startTime || '',
    endTime: endTime || '',
    maxParticipants: Number(maxParticipants) || 0,
    image: image || '',
    subEvents,
  });

  deriveTopLevelFields(event);
  await event.save();

  res.status(201).json({
    message: 'Event submitted! It will appear on /events once an admin approves it ✅',
    event,
  });
});

// ── Read ──────────────────────────────────────────────────

// GET /api/events — approved, upcoming events (browse / explore)
const getEvents = asyncHandler(async (req, res) => {
  const { sport, type, category, game, platform } = req.query;

  const query = {
    approvalStatus: 'approved',
    status: 'upcoming',
    date: { $gte: todayStr() },
  };
  if (category === 'sports' || category === 'esports') query.eventCategory = category;
  if (sport) query.sport = sport;
  // Game filter matches the parent's gameTitle OR any sub-event's — a
  // container event whose game only lives on its sub-events must still
  // surface when someone filters by that game.
  if (game) query.$or = [{ gameTitle: game }, { 'subEvents.gameTitle': game }];
  if (platform) query.platform = platform;
  if (type === 'free' || type === 'paid') query.eventType = type;

  const events = await Event.find(query)
    .populate('organizer', 'name avatar phone hidePhoneNumber')
    .populate('participants.user', 'name avatar')
    .populate('subEvents.bookings.user', 'name avatar')
    .sort({ date: 1, startTime: 1 });

  res.json(events.map((e) => shapeForPublic(e, req.user._id)));
});

// GET /api/events/my — events I created (any status)
const getMyEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id })
    .populate('participants.user', 'name avatar phone hidePhoneNumber email')
    .populate('subEvents.bookings.user', 'name avatar phone hidePhoneNumber email')
    .sort({ createdAt: -1 });

  res.json(scrubEventPhones(events, req.user._id));
});

// GET /api/events/joined — approved events I've joined as a participant,
// either directly or via booking one of its sub-events.
const getJoinedEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({
    approvalStatus: 'approved',
    $or: [
      { 'participants.user': req.user._id },
      { 'subEvents.bookings.user': req.user._id },
    ],
  })
    .populate('organizer', 'name avatar phone hidePhoneNumber')
    .populate('participants.user', 'name avatar')
    .populate('subEvents.bookings.user', 'name avatar')
    .sort({ date: 1, startTime: 1 });

  res.json(events.map((e) => shapeForPublic(e, req.user._id)));
});

// GET /api/events/:id — single event detail
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name avatar phone hidePhoneNumber email')
    .populate('participants.user', 'name avatar phone hidePhoneNumber email')
    .populate('subEvents.bookings.user', 'name avatar phone hidePhoneNumber email');

  if (!event) { res.status(404); throw new Error('Event not found'); }

  const isOwner = event.organizer._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (isOwner || isAdmin) {
    return res.json(scrubEventPhones(event, req.user._id));
  }

  // Non-pending events that aren't approved shouldn't be visible to others
  if (event.approvalStatus !== 'approved') {
    res.status(404);
    throw new Error('Event not found');
  }

  res.json(shapeForPublic(event, req.user._id));
});

// ── Update / Cancel ──────────────────────────────────────────

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  if (event.organizer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to edit this event');
  }
  if (event.approvalStatus !== 'pending') {
    res.status(400);
    throw new Error('Only events awaiting approval can be edited. Cancel and create a new one instead.');
  }

  const editable = ['title', 'sport', 'eventCategory', 'gameTitle', 'platform', 'matchFormat', 'serverRegion', 'prizePool', 'streamUrl', 'description', 'eventType', 'price', 'contactName', 'contactNumber', 'venue', 'date', 'startTime', 'endTime', 'maxParticipants', 'image'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  });
  if (event.eventCategory === 'esports') {
    event.sport = 'esports';
    if (!event.gameTitle) {
      res.status(400);
      throw new Error('Please choose the esports game title');
    }
    if (!event.venue) event.venue = 'Online lobby';
    event.prizePool = Math.max(0, Number(event.prizePool) || 0);
  } else {
    event.gameTitle = '';
    event.platform = '';
    event.matchFormat = '';
    event.serverRegion = '';
    event.prizePool = 0;
    event.streamUrl = '';
  }

  if (req.body.subEvents !== undefined) {
    try {
      event.subEvents = normalizeSubEvents(req.body.subEvents);
    } catch (err) {
      res.status(400);
      throw err;
    }
  }

  const hasSubEvents = event.subEvents && event.subEvents.length > 0;

  if (hasSubEvents) {
    deriveTopLevelFields(event);
  } else {
    if (!event.venue || !event.date || !event.startTime || !event.endTime) {
      res.status(400);
      throw new Error('Please fill all required fields (venue, date, time) or add at least one sub-event');
    }
    if (event.eventType !== 'paid') event.price = 0;
    else if (!event.price || event.price <= 0) {
      res.status(400);
      throw new Error('Please add a valid price for a paid event');
    }
  }

  await event.save();
  res.json({ message: 'Event updated ✅', event });
});

// Organizer (or admin) cancels an event
const cancelEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  const isOwner = event.organizer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this event');
  }

  event.status = 'cancelled';
  await event.save();
  res.json({ message: 'Event cancelled', event });
});

// ── Join / Leave (free events, legacy flat participants) ───

const assertJoinable = (event, user) => {
  if (event.approvalStatus !== 'approved') {
    throw new Error('This event is not open yet');
  }
  if (event.status !== 'upcoming') {
    throw new Error('This event is no longer accepting participants');
  }
  if (event.organizer.toString() === user._id.toString()) {
    throw new Error('You cannot join your own event');
  }
  const already = event.participants.find((p) => p.user.toString() === user._id.toString());
  if (already) {
    throw new Error('You have already joined this event');
  }
  if (event.maxParticipants > 0 && event.participants.length >= event.maxParticipants) {
    throw new Error('This event is full');
  }
  // Every joiner needs a ticket, and a ticket is only useful if we can
  // actually email it to them.
  if (!user.isEmailVerified) {
    const err = new Error('Please verify your email before joining an event — we need it to send your ticket.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }
};

const joinEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  if (event.subEvents && event.subEvents.length > 0) {
    res.status(400);
    throw new Error('This event is organized into sub-events — open one of them to book.');
  }

  if (event.eventType !== 'free') {
    res.status(400);
    throw new Error('This is a paid event — please proceed to payment to join');
  }

  try {
    assertJoinable(event, req.user);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const ticketId = generateTicketId();
  event.participants.push({ user: req.user._id, paymentStatus: 'free', ticketId });
  await event.save();

  // Fire-and-forget: never let a slow/broken mail server block the join
  // response. The ticket is already saved in the DB and visible in-app
  // either way (getJoinedEvents / getEventById), the email is a courtesy.
  sendEventTicketEmail(req.user, event, ticketId)
    .then((sent) => {
      if (sent) {
        Event.updateOne(
          { _id: event._id, 'participants.ticketId': ticketId },
          { $set: { 'participants.$.ticketEmailSent': true } }
        ).catch(() => {});
      }
    })
    .catch(() => {});

  notifyEventTicketIssued({ eventId: event._id, eventTitle: event.title, userId: req.user._id, ticketId });

  res.json({ message: 'You joined the event 🎉 Your ticket has been emailed to you.', event, ticketId });
});

const leaveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  const idx = event.participants.findIndex((p) => p.user.toString() === req.user._id.toString());
  if (idx === -1) {
    res.status(400);
    throw new Error("You haven't joined this event");
  }

  event.participants.splice(idx, 1);
  await event.save();

  res.json({ message: 'You left the event', event });
});

// ── Check-in (organizer confirms someone actually showed up) ─────────
//
// PATCH /api/events/:id/checkin  { ticketId }
// Organizer (or admin) types/scans the ticket ID at the door. This is the
// "admin-side confirmation" piece — before this, there was no record
// anywhere of who actually turned up vs. who just joined online.
const checkInParticipant = asyncHandler(async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId || !ticketId.trim()) {
    res.status(400);
    throw new Error('Ticket ID is required');
  }

  const event = await Event.findById(req.params.id).populate('participants.user', 'name avatar email');
  if (!event) { res.status(404); throw new Error('Event not found'); }

  const isOwner = event.organizer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the event organizer can check participants in');
  }

  const normalized = ticketId.trim().toUpperCase();
  const participant = event.participants.find((p) => p.ticketId === normalized);
  if (!participant) {
    res.status(404);
    throw new Error('No participant found with that ticket ID for this event');
  }
  if (participant.checkedIn) {
    res.status(400);
    throw new Error(`Already checked in at ${new Date(participant.checkedInAt).toLocaleTimeString()}`);
  }

  participant.checkedIn = true;
  participant.checkedInAt = new Date();
  await event.save();

  notifyEventCheckedIn({ eventId: event._id, eventTitle: event.title, userId: participant.user._id || participant.user });

  res.json({
    message: `${participant.user?.name || 'Participant'} checked in`,
    participant: {
      name: participant.user?.name,
      avatar: participant.user?.avatar,
      ticketId: participant.ticketId,
      checkedInAt: participant.checkedInAt,
    },
  });
});

// ── Sub-event booking (join / leave / check-in / pay) ───────

const assertSubEventJoinable = (event, subEvent, user, quantity) => {
  if (event.approvalStatus !== 'approved') {
    throw new Error('This event is not open yet');
  }
  if (event.status !== 'upcoming') {
    throw new Error('This event is no longer accepting bookings');
  }
  if (subEvent.status !== 'upcoming') {
    throw new Error('This sub-event is no longer accepting bookings');
  }
  if (event.organizer.toString() === user._id.toString()) {
    throw new Error('You cannot book your own event');
  }
  const already = subEvent.bookings.find((b) => b.user.toString() === user._id.toString());
  if (already) {
    throw new Error('You already have a booking for this sub-event — cancel it first to rebook with a different quantity.');
  }
  const qty = Number(quantity) || 1;
  if (qty < 1) {
    throw new Error('Please choose at least 1 ticket');
  }
  if (qty > subEvent.maxTicketsPerBooking) {
    throw new Error(`You can book at most ${subEvent.maxTicketsPerBooking} ticket${subEvent.maxTicketsPerBooking > 1 ? 's' : ''} for this sub-event`);
  }
  if (subEvent.capacity > 0) {
    const booked = subEvent.bookings.reduce((sum, b) => sum + (b.quantity || 1), 0);
    if (booked + qty > subEvent.capacity) {
      throw new Error(`Only ${subEvent.capacity - booked} spot(s) left in this sub-event`);
    }
  }
  if (!user.isEmailVerified) {
    const err = new Error('Please verify your email before booking — we need it to send your ticket.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }
};

// POST /api/events/:id/subevents/:subId/join  { quantity }  — free sub-events
const joinSubEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  let subEvent;
  try {
    subEvent = findSubEvent(event, req.params.subId);
  } catch (err) {
    res.status(err.status || 400);
    throw err;
  }

  if (subEvent.eventType !== 'free') {
    res.status(400);
    throw new Error('This is a paid sub-event — please proceed to payment to book');
  }

  const quantity = Number(req.body.quantity) || 1;
  try {
    assertSubEventJoinable(event, subEvent, req.user, quantity);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const ticketId = generateTicketId();
  subEvent.bookings.push({ user: req.user._id, quantity, paymentStatus: 'free', ticketId });
  await event.save();

  sendEventTicketEmail(req.user, event, ticketId, subEvent, quantity)
    .then((sent) => {
      if (sent) {
        Event.updateOne(
          { _id: event._id, 'subEvents._id': subEvent._id, 'subEvents.bookings.ticketId': ticketId },
          { $set: { 'subEvents.$[se].bookings.$[b].ticketEmailSent': true } },
          { arrayFilters: [{ 'se._id': subEvent._id }, { 'b.ticketId': ticketId }] }
        ).catch(() => {});
      }
    })
    .catch(() => {});

  notifyEventTicketIssued({
    eventId: event._id, eventTitle: event.title, userId: req.user._id, ticketId,
    subEventId: subEvent._id, subEventTitle: subEvent.title,
  });

  res.json({ message: 'You booked your spot 🎉 Your ticket has been emailed to you.', event, subEventId: subEvent._id, ticketId });
});

// POST /api/events/:id/subevents/:subId/leave
const leaveSubEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  let subEvent;
  try {
    subEvent = findSubEvent(event, req.params.subId);
  } catch (err) {
    res.status(err.status || 400);
    throw err;
  }

  const idx = subEvent.bookings.findIndex((b) => b.user.toString() === req.user._id.toString());
  if (idx === -1) {
    res.status(400);
    throw new Error("You don't have a booking for this sub-event");
  }

  subEvent.bookings.splice(idx, 1);
  await event.save();

  res.json({ message: 'Your booking was cancelled', event });
});

// PATCH /api/events/:id/subevents/:subId/checkin  { ticketId }
const checkInSubEventParticipant = asyncHandler(async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId || !ticketId.trim()) {
    res.status(400);
    throw new Error('Ticket ID is required');
  }

  const event = await Event.findById(req.params.id).populate('subEvents.bookings.user', 'name avatar email');
  if (!event) { res.status(404); throw new Error('Event not found'); }

  let subEvent;
  try {
    subEvent = findSubEvent(event, req.params.subId);
  } catch (err) {
    res.status(err.status || 400);
    throw err;
  }

  const isOwner = event.organizer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the event organizer can check participants in');
  }

  const normalized = ticketId.trim().toUpperCase();
  const booking = subEvent.bookings.find((b) => b.ticketId === normalized);
  if (!booking) {
    res.status(404);
    throw new Error('No booking found with that ticket ID for this sub-event');
  }
  if (booking.checkedIn) {
    res.status(400);
    throw new Error(`Already checked in at ${new Date(booking.checkedInAt).toLocaleTimeString()}`);
  }

  booking.checkedIn = true;
  booking.checkedInAt = new Date();
  await event.save();

  notifyEventCheckedIn({
    eventId: event._id, eventTitle: event.title, userId: booking.user._id || booking.user,
    subEventId: subEvent._id, subEventTitle: subEvent.title,
  });

  res.json({
    message: `${booking.user?.name || 'Participant'} checked in (${booking.quantity} ticket${booking.quantity > 1 ? 's' : ''})`,
    participant: {
      name: booking.user?.name,
      avatar: booking.user?.avatar,
      ticketId: booking.ticketId,
      quantity: booking.quantity,
      checkedInAt: booking.checkedInAt,
    },
  });
});

// POST /api/events/:id/subevents/:subId/pay/order  { quantity }
const createSubEventOrder = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  let subEvent;
  try {
    subEvent = findSubEvent(event, req.params.subId);
  } catch (err) {
    res.status(err.status || 400);
    throw err;
  }

  if (subEvent.eventType !== 'paid') {
    res.status(400);
    throw new Error('This sub-event is free — book directly, no payment needed');
  }

  const quantity = Number(req.body.quantity) || 1;
  try {
    assertSubEventJoinable(event, subEvent, req.user, quantity);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const razorpay = getRazorpay();
  const amount = subEvent.price * quantity;

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      // Razorpay caps `receipt` at 40 characters.
      receipt: `sev_${subEvent._id.toString().slice(-10)}_${Date.now()}`,
      notes: {
        eventId: event._id.toString(),
        subEventId: subEvent._id.toString(),
        userId: req.user._id.toString(),
        quantity: String(quantity),
        type: 'subevent_booking',
      },
    });
  } catch (err) {
    const reason = err?.error?.description || err.message || 'Unknown Razorpay error';
    res.status(err?.statusCode && err.statusCode < 500 ? 400 : 502);
    throw new Error(`Could not create payment order: ${reason}`);
  }

  res.json({
    orderId: order.id,
    amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    event: { _id: event._id, title: event.title },
    subEvent: { _id: subEvent._id, title: subEvent.title },
    quantity,
  });
});

// POST /api/events/:id/subevents/:subId/pay/verify
const verifySubEventPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, quantity } = req.body;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }

  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  let subEvent;
  try {
    subEvent = findSubEvent(event, req.params.subId);
  } catch (err) {
    res.status(err.status || 400);
    throw err;
  }

  const qty = Number(quantity) || 1;
  try {
    assertSubEventJoinable(event, subEvent, req.user, qty);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const ticketId = generateTicketId();
  subEvent.bookings.push({
    user: req.user._id,
    quantity: qty,
    paymentStatus: 'paid',
    amountPaid: subEvent.price * qty,
    razorpayOrderId,
    razorpayPaymentId,
    ticketId,
  });
  await event.save();

  sendEventTicketEmail(req.user, event, ticketId, subEvent, qty)
    .then((sent) => {
      if (sent) {
        Event.updateOne(
          { _id: event._id, 'subEvents._id': subEvent._id, 'subEvents.bookings.ticketId': ticketId },
          { $set: { 'subEvents.$[se].bookings.$[b].ticketEmailSent': true } },
          { arrayFilters: [{ 'se._id': subEvent._id }, { 'b.ticketId': ticketId }] }
        ).catch(() => {});
      }
    })
    .catch(() => {});

  notifyEventTicketIssued({
    eventId: event._id, eventTitle: event.title, userId: req.user._id, ticketId,
    subEventId: subEvent._id, subEventTitle: subEvent.title,
  });

  res.json({ message: 'Payment successful — you booked your spot 🎉 Your ticket has been emailed to you.', event, subEventId: subEvent._id, ticketId });
});

// ── Payment flow (paid events, legacy flat) ─────────────────

const createEventOrder = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  if (event.eventType !== 'paid') {
    res.status(400);
    throw new Error('This event is free — join directly, no payment needed');
  }

  try {
    assertJoinable(event, req.user);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const razorpay = getRazorpay();

  let order;
  try {
    order = await razorpay.orders.create({
      amount: event.price * 100,
      currency: 'INR',
      // Razorpay caps `receipt` at 40 characters. A full ObjectId + timestamp
      // ("event_<24-char id>_<13-digit timestamp>") is 44 chars and gets
      // rejected — use the id's last 10 chars instead, still unique enough
      // paired with the timestamp.
      receipt: `evt_${event._id.toString().slice(-10)}_${Date.now()}`,
      notes: {
        eventId: event._id.toString(),
        userId: req.user._id.toString(),
        type: 'event_join',
      },
    });
  } catch (err) {
    // Razorpay SDK errors nest the real reason under err.error.description —
    // err.message alone is often a generic "Request failed" string, which is
    // why this used to surface as an unhelpful bare 500.
    const reason = err?.error?.description || err.message || 'Unknown Razorpay error';
    res.status(err?.statusCode && err.statusCode < 500 ? 400 : 502);
    throw new Error(`Could not create payment order: ${reason}`);
  }

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

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    res.status(400);
    throw new Error('Payment verification failed');
  }

  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  try {
    assertJoinable(event, req.user);
  } catch (err) {
    res.status(400);
    throw err;
  }

  const ticketId = generateTicketId();

  event.participants.push({
    user: req.user._id,
    paymentStatus: 'paid',
    amountPaid: event.price,
    razorpayOrderId,
    razorpayPaymentId,
    ticketId,
  });
  await event.save();

  sendEventTicketEmail(req.user, event, ticketId)
    .then((sent) => {
      if (sent) {
        Event.updateOne(
          { _id: event._id, 'participants.ticketId': ticketId },
          { $set: { 'participants.$.ticketEmailSent': true } }
        ).catch(() => {});
      }
    })
    .catch(() => {});

  notifyEventTicketIssued({ eventId: event._id, eventTitle: event.title, userId: req.user._id, ticketId });

  res.json({ message: 'Payment successful — you joined the event 🎉 Your ticket has been emailed to you.', event, ticketId });
});

// ── Admin moderation ─────────────────────────────────────────

const getEventsForAdmin = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const query = status === 'all' ? {} : { approvalStatus: status };

  const events = await Event.find(query)
    .populate('organizer', 'name email phone avatar')
    .sort({ createdAt: -1 });

  res.json(events);
});

const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  event.approvalStatus = 'approved';
  event.rejectionReason = '';
  await event.save();

  res.json({ message: 'Event approved ✅', event });
});

const rejectEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) { res.status(404); throw new Error('Event not found'); }

  event.approvalStatus = 'rejected';
  event.rejectionReason = req.body.reason || 'Event rejected by admin';
  await event.save();

  res.json({ message: 'Event rejected', event });
});

export {
  createEvent,
  getEvents,
  getMyEvents,
  getJoinedEvents,
  getEventById,
  updateEvent,
  cancelEvent,
  joinEvent,
  leaveEvent,
  checkInParticipant,
  createEventOrder,
  verifyEventPayment,
  joinSubEvent,
  leaveSubEvent,
  checkInSubEventParticipant,
  createSubEventOrder,
  verifySubEventPayment,
  getEventsForAdmin,
  approveEvent,
  rejectEvent,
};
