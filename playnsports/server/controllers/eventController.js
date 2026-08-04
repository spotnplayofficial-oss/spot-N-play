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
  return event;
};

// ── Create ────────────────────────────────────────────────

const createEvent = asyncHandler(async (req, res) => {
  const {
    title, sport, description, eventType, price,
    contactName, contactNumber, venue,
    date, startTime, endTime, maxParticipants, image,
  } = req.body;

  if (!title || !sport || !venue || !date || !startTime || !endTime || !contactNumber) {
    res.status(400);
    throw new Error('Please fill all required fields (title, sport, venue, date, time, contact number)');
  }

  const type = eventType === 'paid' ? 'paid' : 'free';

  if (type === 'paid' && (!price || Number(price) <= 0)) {
    res.status(400);
    throw new Error('Please add a valid price for a paid event');
  }

  const event = await Event.create({
    organizer: req.user._id,
    title,
    sport,
    description: description || '',
    eventType: type,
    price: type === 'paid' ? Number(price) : 0,
    contactName: contactName || req.user.name,
    contactNumber,
    venue,
    date,
    startTime,
    endTime,
    maxParticipants: Number(maxParticipants) || 0,
    image: image || '',
  });

  res.status(201).json({
    message: 'Event submitted! It will appear on /events once an admin approves it ✅',
    event,
  });
});

// ── Read ──────────────────────────────────────────────────

// GET /api/events — approved, upcoming events (browse / explore)
const getEvents = asyncHandler(async (req, res) => {
  const { sport, type } = req.query;

  const query = {
    approvalStatus: 'approved',
    status: 'upcoming',
    date: { $gte: todayStr() },
  };
  if (sport) query.sport = sport;
  if (type === 'free' || type === 'paid') query.eventType = type;

  const events = await Event.find(query)
    .populate('organizer', 'name avatar phone hidePhoneNumber')
    .populate('participants.user', 'name avatar')
    .sort({ date: 1, startTime: 1 });

  res.json(events.map((e) => shapeForPublic(e, req.user._id)));
});

// GET /api/events/my — events I created (any status)
const getMyEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ organizer: req.user._id })
    .populate('participants.user', 'name avatar phone hidePhoneNumber email')
    .sort({ createdAt: -1 });

  res.json(scrubEventPhones(events, req.user._id));
});

// GET /api/events/joined — approved events I've joined as a participant
const getJoinedEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({
    'participants.user': req.user._id,
    approvalStatus: 'approved',
  })
    .populate('organizer', 'name avatar phone hidePhoneNumber')
    .populate('participants.user', 'name avatar')
    .sort({ date: 1, startTime: 1 });

  res.json(events.map((e) => shapeForPublic(e, req.user._id)));
});

// GET /api/events/:id — single event detail
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name avatar phone hidePhoneNumber email')
    .populate('participants.user', 'name avatar phone hidePhoneNumber email');

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

  const editable = ['title', 'sport', 'description', 'eventType', 'price', 'contactName', 'contactNumber', 'venue', 'date', 'startTime', 'endTime', 'maxParticipants', 'image'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  });

  if (event.eventType !== 'paid') event.price = 0;
  else if (!event.price || event.price <= 0) {
    res.status(400);
    throw new Error('Please add a valid price for a paid event');
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

// ── Join / Leave (free events) ──────────────────────────────

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

// ── Payment flow (paid events) ──────────────────────────────

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
  getEventsForAdmin,
  approveEvent,
  rejectEvent,
};