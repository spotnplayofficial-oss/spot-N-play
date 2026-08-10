import asyncHandler from 'express-async-handler';
import Ground from '../models/Ground.js';
import VenueLead from '../models/VenueLead.js';
import { generateTicketId } from '../utils/ticket.js';
import { sendVenueTrialEmail } from '../utils/sendEmail.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';
import { notifyVenueTrialClaimed, notifyVenueCheckedIn, notifyVenueInterestShown } from '../services/notificationService.js';

const TRIAL_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
// Interest leads never expire — this is just a far-future placeholder so
// they satisfy the shared schema without meaning anything.
const NO_EXPIRY = new Date('2099-12-31T00:00:00.000Z');

// GET /api/venues — grounds + social grounds + gyms + pools, unified. Same
// approved-only gate as getAllGrounds; venueType is an optional filter
// for the tabs/chips on the Venues page and Map. Deliberately does NOT
// filter by price/venueMode here — trial/interest/live venues all show up
// in the same list; the detail page decides what to render.
const getVenues = asyncHandler(async (req, res) => {
  const { venueType, sport, name } = req.query;

  const query = { isActive: true, isApproved: true, approvalStatus: 'approved' };
  if (venueType && venueType !== 'all') query.venueType = venueType;
  if (sport) query.$or = [{ sport }, { 'sports.name': sport }];

  let venues = await Ground.find(query).populate('owner', 'name phone hidePhoneNumber');

  if (name && name.trim()) {
    const term = name.trim().toLowerCase();
    venues = venues.filter((v) => v.name?.toLowerCase().includes(term));
  }

  res.json(scrubNestedPhone(venues, 'owner', req.user._id));
});

// GET /api/venues/:id — same venue doc as /grounds/:id, but also attaches
// lead-flow state for the current user depending on the venue's mode:
//  - 'trial': attaches `myTrial` (ticket/status/expiry), same as before.
//  - 'interest': merely opening this endpoint IS the interest signal —
//    the first time a given user views it, a lead gets recorded and the
//    owner gets notified. Repeat views are a no-op (idempotent — one lead
//    per user per venue, never double-counted). `myInterest: true` tells
//    the frontend to show a "we've noted your interest" confirmation
//    instead of an actionable button.
//  - 'live': lead data isn't relevant — the frontend redirects to the real
//    sport/court/capacity booking flow instead.
const getVenueById = asyncHandler(async (req, res) => {
  const venue = await Ground.findById(req.params.id).populate('owner', 'name phone hidePhoneNumber avatar');
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }

  const shaped = scrubNestedPhone(venue.toObject(), 'owner', req.user._id);

  if (venue.venueMode === 'trial') {
    const lead = await VenueLead.findOne({ venue: venue._id, user: req.user._id, type: 'trial' });
    shaped.myTrial = lead
      ? { status: lead.status, ticketId: lead.ticketId, expiresAt: lead.expiresAt, checkedInAt: lead.checkedInAt }
      : null;
  } else if (venue.venueMode === 'interest') {
    const existing = await VenueLead.findOne({ venue: venue._id, user: req.user._id, type: 'interest' });
    if (!existing) {
      try {
        await VenueLead.create({
          venue: venue._id,
          user: req.user._id,
          type: 'interest',
          status: 'interested',
          ticketId: generateTicketId(),
          expiresAt: NO_EXPIRY,
        });
        notifyVenueInterestShown({
          venueId: venue._id,
          venueType: venue.venueType,
          ownerId: venue.owner,
          userId: req.user._id,
          userName: req.user.name,
          venueName: venue.name,
        });
      } catch (err) {
        // Duplicate-key race (two near-simultaneous requests from the same
        // user) just means someone else's request already recorded it —
        // fine to ignore, the unique index did its job.
        if (err.code !== 11000) throw err;
      }
    }
    shaped.myInterest = true;
  }

  res.json(shaped);
});

// POST /api/venues/:id/claim-trial — only while the venue is in 'trial'
// mode. ('interest' mode never needs an explicit claim — viewing the
// venue already recorded the signal — and 'live' venues book for real.)
const claimTrial = asyncHandler(async (req, res) => {
  const venue = await Ground.findById(req.params.id);
  if (!venue) { res.status(404); throw new Error('Venue not found'); }
  if (venue.venueMode === 'live') {
    res.status(400);
    throw new Error('This venue is live now — book a slot directly instead of a trial');
  }
  if (venue.venueMode === 'interest') {
    res.status(400);
    throw new Error('This venue only needs your interest right now — no trial to claim yet');
  }
  if (venue.approvalStatus !== 'approved') {
    res.status(400);
    throw new Error('This venue is not yet live');
  }

  const existing = await VenueLead.findOne({ venue: venue._id, user: req.user._id, type: 'trial' });
  const now = new Date();

  if (existing && existing.expiresAt > now) {
    // Already have a live trial — hand back what they've got instead of
    // silently issuing a second ticket.
    return res.json({
      message: 'You already have an active trial for this venue',
      ticketId: existing.ticketId,
      expiresAt: existing.expiresAt,
      status: existing.status,
    });
  }

  const ticketId = generateTicketId();
  const expiresAt = new Date(now.getTime() + TRIAL_DURATION_MS);

  const lead = existing
    ? Object.assign(existing, { ticketId, status: 'interested', issuedAt: now, expiresAt, checkedInAt: null })
    : new VenueLead({ venue: venue._id, user: req.user._id, type: 'trial', ticketId, issuedAt: now, expiresAt });
  await lead.save();

  sendVenueTrialEmail(req.user, venue, ticketId, expiresAt).catch(() => {});
  notifyVenueTrialClaimed({
    venueId: venue._id,
    venueType: venue.venueType,
    ownerId: venue.owner,
    userId: req.user._id,
    userName: req.user.name,
    venueName: venue.name,
  });

  res.status(201).json({
    message: 'Your 2-day free trial is confirmed 🎉 Check your email for the ticket.',
    ticketId,
    expiresAt,
    status: 'interested',
  });
});

// PATCH /api/venues/:id/checkin  { ticketId } — venue owner (or admin)
// checks a claimed trial in at the door. Mirrors event check-in exactly.
// Only applies to trial-type leads — there's nothing to check in for an
// interest-only signal.
const checkInLead = asyncHandler(async (req, res) => {
  const { ticketId } = req.body;
  if (!ticketId || !ticketId.trim()) {
    res.status(400);
    throw new Error('Ticket ID is required');
  }

  const venue = await Ground.findById(req.params.id);
  if (!venue) { res.status(404); throw new Error('Venue not found'); }

  const isOwner = venue.owner.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the venue owner can check trials in');
  }

  const normalized = ticketId.trim().toUpperCase();
  const lead = await VenueLead.findOne({ venue: venue._id, ticketId: normalized }).populate('user', 'name avatar email');
  if (!lead) {
    res.status(404);
    throw new Error('No trial found with that ticket ID for this venue');
  }
  if (lead.type !== 'trial') {
    res.status(400);
    throw new Error('This is an interest signal, not a trial ticket — nothing to check in');
  }
  if (lead.status === 'checked_in') {
    res.status(400);
    throw new Error(`Already checked in at ${new Date(lead.checkedInAt).toLocaleTimeString()}`);
  }
  if (lead.expiresAt < new Date()) {
    res.status(400);
    throw new Error('This trial ticket has expired');
  }

  lead.status = 'checked_in';
  lead.checkedInAt = new Date();
  await lead.save();

  notifyVenueCheckedIn({ venueId: venue._id, userId: lead.user._id, venueName: venue.name });

  res.json({
    message: `${lead.user?.name || 'Guest'} checked in`,
    lead: { name: lead.user?.name, avatar: lead.user?.avatar, ticketId: lead.ticketId, checkedInAt: lead.checkedInAt },
  });
});

// GET /api/venues/my/leads — every lead (trial claims AND interest
// signals) across every venue this owner has.
const getMyLeads = asyncHandler(async (req, res) => {
  const myVenues = await Ground.find({ owner: req.user._id }).select('_id name');
  const venueIds = myVenues.map((v) => v._id);

  const leads = await VenueLead.find({ venue: { $in: venueIds } })
    .populate('user', 'name phone avatar email')
    .populate('venue', 'name')
    .sort({ createdAt: -1 });

  res.json(leads);
});

export { getVenues, getVenueById, claimTrial, checkInLead, getMyLeads };
