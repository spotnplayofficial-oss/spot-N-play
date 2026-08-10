import asyncHandler from 'express-async-handler';
import Ground from '../models/Ground.js';
import VenueLead from '../models/VenueLead.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';

// Owners type slot dates in by hand (see addSlots below) and nothing ever
// prunes them — so a slot from months ago that never got booked just sits
// in the array forever and shows up as "available" indefinitely. This
// strips those out of PLAYER-FACING responses only (booked slots are left
// alone so booking history stays intact, and owners still see everything
// via getMyGrounds so they can manage/delete old entries themselves).
const todayStr = () => new Date().toISOString().split('T')[0];

const withoutStaleSlots = (groundDoc) => {
  const g = groundDoc.toObject ? groundDoc.toObject() : groundDoc;
  const today = todayStr();
  if (Array.isArray(g.slots)) {
    g.slots = g.slots.filter((s) => s.isBooked || s.date >= today);
  }
  return g;
};

// Keeps the legacy single-sport fields (`sport`, `pricePerHour`) mirroring
// sports[0] so old code paths (search filters, cards that never got
// migrated, the mobile app if one exists, etc.) keep working unchanged
// while all new code reads from `sports[]`.
const syncLegacySportFields = (ground) => {
  if (ground.sports && ground.sports.length > 0) {
    ground.sport = ground.sports[0].name;
    ground.pricePerHour = ground.sports[0].pricePerHour;
  }
};

// Normalizes whatever shape of `sports` the client sent into clean
// subdocument data. Accepts either full objects (from the new owner UI) or
// falls back to building one entry from the old flat sport/pricePerHour
// fields (old clients / API callers that haven't updated yet).
const buildSportsInput = (body) => {
  const { sports, sport, pricePerHour, venueType } = body;

  if (Array.isArray(sports) && sports.length > 0) {
    return sports.map((s) => ({
      name: s.name,
      pricePerHour: venueType === 'pool' ? 0 : (Number(s.pricePerHour) || 0),
      slotDurationMinutes: Number(s.slotDurationMinutes) || 60,
      bookingMode: s.bookingMode === 'specific' ? 'specific' : 'auto',
      capacityPerSlot: s.capacityPerSlot ? Number(s.capacityPerSlot) : null,
      courts: Array.isArray(s.courts) ? s.courts.filter(c => c.name?.trim()).map(c => ({ name: c.name.trim(), isActive: c.isActive !== false })) : [],
      isActive: s.isActive !== false,
    }));
  }

  if (venueType === 'gym' || venueType === 'pool') {
    // Capacity-style venue with no explicit sports payload — one implicit
    // entry so the booking system still has something to hang slots off of.
    return [{
      name: venueType === 'pool' ? 'swimming' : 'gym',
      pricePerHour: Number(pricePerHour) || 0,
      slotDurationMinutes: 60,
      bookingMode: 'auto',
      capacityPerSlot: null,
      courts: [],
      isActive: true,
    }];
  }

  if (sport) {
    return [{
      name: sport,
      pricePerHour: Number(pricePerHour) || 0,
      slotDurationMinutes: 60,
      bookingMode: 'auto',
      capacityPerSlot: null,
      courts: [],
      isActive: true,
    }];
  }

  return [];
};

const createGround = asyncHandler(async (req, res) => {
  const { name, address, coordinates, longitude, latitude, amenities, isSocial, venueType, description, images } = req.body;
  const coords = coordinates || [parseFloat(longitude), parseFloat(latitude)];

  // venueType is the source of truth when provided; isSocial is derived
  // from it so every existing isSocial-based filter (Home, Map, etc.)
  // keeps working without changes.
  const resolvedType = venueType || (isSocial ? 'social' : 'ground');
  const sportsInput = buildSportsInput({ ...req.body, venueType: resolvedType });

  const ground = new Ground({
    owner: req.user._id,
    name,
    address,
    location: { type: 'Point', coordinates: coords },
    amenities: amenities || [],
    images: images || [],
    description: description || '',
    venueType: resolvedType,
    isSocial: resolvedType === 'social',
    sports: sportsInput,
    isApproved: false,
    approvalStatus: 'pending',
  });

  syncLegacySportFields(ground);
  await ground.save();

  res.status(201).json(ground);
});

// Owner sees ALL their grounds (including pending/rejected) so they know status
const getMyGrounds = asyncHandler(async (req, res) => {
  const grounds = await Ground.find({ owner: req.user._id });

  // Attach trial-claim / interest-signal counts for venues that aren't
  // live yet, so the owner dashboard can show "12 interested" without a
  // separate round-trip.
  const groundIds = grounds.map((g) => g._id);
  const counts = await VenueLead.aggregate([
    { $match: { venue: { $in: groundIds } } },
    { $group: { _id: { venue: '$venue', type: '$type' }, count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => {
    const key = String(c._id.venue);
    countMap[key] = countMap[key] || { trial: 0, interest: 0 };
    countMap[key][c._id.type] = c.count;
  });

  const shaped = grounds.map((g) => {
    const obj = g.toObject();
    const c = countMap[String(g._id)] || { trial: 0, interest: 0 };
    obj.trialLeadCount = c.trial;
    obj.interestLeadCount = c.interest;
    return obj;
  });

  res.json(shaped);
});

// Public/player-facing: only approved grounds
const getNearbyGrounds = asyncHandler(async (req, res) => {
  const { longitude, latitude, radius = 5000, sport, name } = req.query;

  const safeRadius = Math.min(Math.abs(parseFloat(radius) || 5000), 100000);

  const query = {
    isActive: true,
    isApproved: true,
    approvalStatus: 'approved',
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: safeRadius,
      },
    },
  };

  // Match either the legacy flat field or any sport inside the new sports[]
  // array, since venues can now offer more than one sport.
  if (sport) query.$or = [{ sport }, { 'sports.name': sport }];

  let grounds = await Ground.find(query).populate('owner', 'name phone hidePhoneNumber');

  if (name && name.trim()) {
    const term = name.trim().toLowerCase();
    grounds = grounds.filter(g => g.name?.toLowerCase().includes(term));
  }

  grounds = grounds.map(withoutStaleSlots);

  res.json(scrubNestedPhone(grounds, 'owner', req.user._id));
});

const getGroundById = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id).populate('owner', 'name phone hidePhoneNumber avatar');

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found');
  }

  res.json(scrubNestedPhone(withoutStaleSlots(ground), 'owner', req.user._id));
});

// ── Sport & court management (owner) ───────────────────────────────────

const addSport = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const { name, pricePerHour, slotDurationMinutes, bookingMode, capacityPerSlot, courts } = req.body;
  if (!name) { res.status(400); throw new Error('Sport name is required'); }

  ground.sports.push({
    name,
    pricePerHour: ground.venueType === 'pool' ? 0 : (Number(pricePerHour) || 0),
    slotDurationMinutes: Number(slotDurationMinutes) || 60,
    bookingMode: bookingMode === 'specific' ? 'specific' : 'auto',
    capacityPerSlot: capacityPerSlot ? Number(capacityPerSlot) : null,
    courts: Array.isArray(courts) ? courts.filter(c => c?.trim()).map(c => ({ name: c.trim() })) : [],
  });

  syncLegacySportFields(ground);
  await ground.save();
  res.status(201).json(ground);
});

const updateSport = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const sportDoc = ground.sports.id(req.params.sportId);
  if (!sportDoc) { res.status(404); throw new Error('Sport not found on this venue'); }

  const { pricePerHour, slotDurationMinutes, bookingMode, capacityPerSlot, isActive } = req.body;
  if (pricePerHour !== undefined) sportDoc.pricePerHour = Number(pricePerHour) || 0;
  if (slotDurationMinutes !== undefined) sportDoc.slotDurationMinutes = Number(slotDurationMinutes) || 60;
  if (bookingMode !== undefined) sportDoc.bookingMode = bookingMode === 'specific' ? 'specific' : 'auto';
  if (capacityPerSlot !== undefined) sportDoc.capacityPerSlot = capacityPerSlot ? Number(capacityPerSlot) : null;
  if (isActive !== undefined) sportDoc.isActive = !!isActive;

  syncLegacySportFields(ground);
  await ground.save();
  res.json(ground);
});

const removeSport = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const hasFutureBookedSlots = ground.slots.some(
    s => String(s.sportId) === req.params.sportId && s.isBooked && s.date >= todayStr()
  );
  if (hasFutureBookedSlots) {
    res.status(400);
    throw new Error('Cannot remove a sport with upcoming booked slots — cancel or wait for them to pass first');
  }

  ground.sports = ground.sports.filter(s => String(s._id) !== req.params.sportId);
  ground.slots = ground.slots.filter(s => String(s.sportId) !== req.params.sportId);
  syncLegacySportFields(ground);
  await ground.save();
  res.json(ground);
});

const addCourt = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const sportDoc = ground.sports.id(req.params.sportId);
  if (!sportDoc) { res.status(404); throw new Error('Sport not found on this venue'); }

  const { name } = req.body;
  if (!name?.trim()) { res.status(400); throw new Error('Court name is required'); }

  sportDoc.courts.push({ name: name.trim() });
  await ground.save();
  res.status(201).json(ground);
});

const updateCourt = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const sportDoc = ground.sports.id(req.params.sportId);
  if (!sportDoc) { res.status(404); throw new Error('Sport not found on this venue'); }
  const court = sportDoc.courts.id(req.params.courtId);
  if (!court) { res.status(404); throw new Error('Court not found'); }

  const { name, isActive } = req.body;
  if (name !== undefined && name.trim()) court.name = name.trim();
  if (isActive !== undefined) court.isActive = !!isActive;

  await ground.save();
  res.json(ground);
});

const removeCourt = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const sportDoc = ground.sports.id(req.params.sportId);
  if (!sportDoc) { res.status(404); throw new Error('Sport not found on this venue'); }

  const hasFutureBookedSlots = ground.slots.some(
    s => String(s.courtId) === req.params.courtId && s.isBooked && s.date >= todayStr()
  );
  if (hasFutureBookedSlots) {
    res.status(400);
    throw new Error('Cannot remove a court with upcoming booked slots');
  }

  sportDoc.courts = sportDoc.courts.filter(c => String(c._id) !== req.params.courtId);
  ground.slots = ground.slots.filter(s => String(s.courtId) !== req.params.courtId);
  await ground.save();
  res.json(ground);
});

// ── Slot management (owner) ─────────────────────────────────────────────
//
// `slots` in the request body is a list of { date, startTime, endTime }.
// The sport's bookingMode decides how each one turns into slot documents:
//  - 'specific': one slot document per active court (or the explicit
//    `courtIds` subset, if provided) for every requested time — players
//    pick a named court.
//  - 'auto': one slot document per requested time, with `capacity` set to
//    however many active courts that sport has (court-based) or the
//    sport's capacityPerSlot (capacity-based, e.g. pool) — players just
//    book "a spot", the system doesn't care which physical court.
const addSlots = asyncHandler(async (req, res) => {
  const { slots, sportId, courtIds } = req.body;

  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  if (ground.approvalStatus !== 'approved') {
    res.status(403);
    throw new Error('Cannot add slots — ground is not yet approved by admin');
  }

  if (ground.venueMode !== 'live') {
    res.status(403);
    throw new Error('This venue is still in its trial phase — slot booking opens once it goes live');
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    res.status(400);
    throw new Error('No slot times provided');
  }

  // Backward-compat: an old client that never migrated can still send
  // sportId-less requests as long as the venue only has one sport.
  const sportDoc = sportId ? ground.sports.id(sportId) : ground.sports[0];
  if (!sportDoc) {
    res.status(400);
    throw new Error('Sport not found on this venue — add a sport before adding slots');
  }

  const newSlots = [];

  if (sportDoc.bookingMode === 'specific') {
    const activeCourts = sportDoc.courts.filter(c => c.isActive);
    const targetCourts = Array.isArray(courtIds) && courtIds.length > 0
      ? activeCourts.filter(c => courtIds.includes(String(c._id)))
      : activeCourts;

    if (targetCourts.length === 0) {
      res.status(400);
      throw new Error('This sport has no active courts to add slots for');
    }

    for (const { date, startTime, endTime } of slots) {
      for (const court of targetCourts) {
        newSlots.push({
          sportId: sportDoc._id,
          courtId: court._id,
          date, startTime, endTime,
          capacity: 1,
          bookedCount: 0,
          bookedBy: [],
          isBooked: false,
        });
      }
    }
  } else {
    const capacity = sportDoc.courts.length > 0
      ? Math.max(sportDoc.courts.filter(c => c.isActive).length, 1)
      : (sportDoc.capacityPerSlot || Ground.NO_CAP);

    for (const { date, startTime, endTime } of slots) {
      newSlots.push({
        sportId: sportDoc._id,
        courtId: null,
        date, startTime, endTime,
        capacity,
        bookedCount: 0,
        bookedBy: [],
        isBooked: false,
      });
    }
  }

  ground.slots.push(...newSlots);
  await ground.save();

  res.json(ground);
});

// Owner removes a slot they created (only if not booked)
const removeSlot = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  const slot = ground.slots.id(req.params.slotId);
  if (!slot) {
    res.status(404);
    throw new Error('Slot not found');
  }

  if (slot.bookedCount > 0) {
    res.status(400);
    throw new Error('Cannot remove a slot that already has bookings');
  }

  ground.slots = ground.slots.filter(s => s._id.toString() !== req.params.slotId);
  await ground.save();

  res.json(ground);
});

const updateGround = asyncHandler(async (req, res) => {
  const { name, address, coordinates, longitude, latitude, amenities, isSocial, venueType, description, images } = req.body;
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  const coords = coordinates || (longitude && latitude ? [parseFloat(longitude), parseFloat(latitude)] : null);

  ground.name = name || ground.name;
  ground.address = address || ground.address;
  ground.amenities = amenities || ground.amenities;
  if (description !== undefined) ground.description = description;
  if (images !== undefined) ground.images = images;
  if (venueType !== undefined) {
    ground.venueType = venueType;
    ground.isSocial = venueType === 'social';
  } else if (isSocial !== undefined) {
    ground.isSocial = isSocial;
  }
  if (coords) ground.location = { type: 'Point', coordinates: coords };

  await ground.save();
  res.json(ground);
});

const deleteGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  await ground.deleteOne();
  res.json({ message: 'Ground deleted successfully' });
});

const getAllGrounds = asyncHandler(async (req, res) => {
  const { sport, name } = req.query;

  const query = { isActive: true, isApproved: true, approvalStatus: 'approved' };
  if (sport) query.$or = [{ sport }, { 'sports.name': sport }];

  let grounds = await Ground.find(query).populate('owner', 'name phone hidePhoneNumber');

  if (name && name.trim()) {
    const term = name.trim().toLowerCase();
    grounds = grounds.filter(g => g.name?.toLowerCase().includes(term));
  }

  grounds = grounds.map(withoutStaleSlots);

  res.json(scrubNestedPhone(grounds, 'owner', req.user._id));
});

export {
  createGround, getMyGrounds, getNearbyGrounds, getAllGrounds, getGroundById,
  addSport, updateSport, removeSport, addCourt, updateCourt, removeCourt,
  addSlots, removeSlot, updateGround, deleteGround,
};
