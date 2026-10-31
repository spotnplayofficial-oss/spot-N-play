import asyncHandler from 'express-async-handler';
import Ground from '../models/Ground.js';
import VenueLead from '../models/VenueLead.js';
import PoolConfig from '../models/PoolConfig.js';
import PoolBookingSlot from '../models/PoolBookingSlot.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';
import {
  syncGroundAutomatedSlots,
  toggleWeeklyBlock,
  startOverrideDate,
  revertOverrideDate,
  buildDefaultWeeklyBlocks,
} from '../services/slotAutomationService.js';

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
    g.slots = g.slots.filter((s) => s.isBooked || (s.bookedCount || 0) > 0 || s.date >= today);
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
  const customPrice = Math.max(0, Number(body.customPricePerHour) || 0);
  const preference = ['normal', 'custom'].includes(body.pricingPreference) ? body.pricingPreference : 'normal';

  if (Array.isArray(sports) && sports.length > 0) {
    return sports.map((s) => ({
      name: s.name,
      pricePerHour: venueType === 'pool' ? 0 : (Number(s.pricePerHour) || 0),
      customPricePerHour: Math.max(0, Number(s.customPricePerHour) || customPrice),
      pricingPreference: ['normal', 'custom'].includes(s.pricingPreference) ? s.pricingPreference : preference,
      customPricingTypes: {
        hourly: s.customPricingTypes?.hourly !== false,
        subscription: s.customPricingTypes?.subscription !== false,
      },
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
      customPricePerHour: customPrice,
      pricingPreference: preference,
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
      customPricePerHour: customPrice,
      pricingPreference: preference,
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

  // Coordinate parsing & validation
  const coords = Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(Number(coordinates[0])) && !isNaN(Number(coordinates[1]))
    ? [Number(coordinates[0]), Number(coordinates[1])]
    : (longitude !== undefined && latitude !== undefined && !isNaN(parseFloat(longitude)) && !isNaN(parseFloat(latitude))
        ? [parseFloat(longitude), parseFloat(latitude)]
        : null);

  if (!coords) {
    res.status(400);
    throw new Error('Valid map location coordinates [longitude, latitude] are required. Please pin your ground on the map.');
  }

  // venueType is the source of truth when provided; isSocial is derived
  // from it so every existing isSocial-based filter (Home, Map, etc.)
  // keeps working without changes.
  const resolvedType = venueType || (isSocial ? 'social' : 'ground');
  const customPrice = Math.max(0, Number(req.body.customPricePerHour) || 0);
  const preference = ['normal', 'custom'].includes(req.body.pricingPreference) ? req.body.pricingPreference : 'normal';

  const sportsInput = buildSportsInput({ ...req.body, venueType: resolvedType, customPricePerHour: customPrice, pricingPreference: preference });

  const customPricingTypes = {
    hourly: req.body.customPricingTypes?.hourly !== false,
    subscription: req.body.customPricingTypes?.subscription !== false,
  };

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
    customPricePerHour: customPrice,
    pricingPreference: preference,
    sports: sportsInput,
    customPricingTypes,
    bookingRequestsEnabled: resolvedType !== 'pool' && Boolean(req.body.bookingRequestsEnabled),
    isApproved: false,
    approvalStatus: 'pending',
  });

  if (Array.isArray(req.body.customHourlyPricing) && req.body.customHourlyPricing.length > 0) {
    ground.customHourlyPricing = req.body.customHourlyPricing.map((item) => ({
      hours: Math.max(1, Number(item.hours) || 1),
      price: Math.max(0, Number(item.price) || 0),
      label: item.label || '',
    }));
  } else if (customPrice > 0) {
    ground.customHourlyPricing = [
      { hours: 1, price: customPrice, label: '1 Hour (Base Rate)' },
      { hours: 2, price: Math.round(customPrice * 1.9), label: '2 Hours' },
      { hours: 3, price: Math.round(customPrice * 2.8), label: '3 Hours' },
      { hours: 4, price: Math.round(customPrice * 3.6), label: '4 Hours' },
    ];
  }

  if (req.body.customSubscriptionPricing && typeof req.body.customSubscriptionPricing === 'object') {
    const sp = req.body.customSubscriptionPricing;
    ground.customSubscriptionPricing = {
      oneMonth: Math.max(0, Number(sp.oneMonth) || 0),
      threeMonths: Math.max(0, Number(sp.threeMonths) || 0),
      sixMonths: Math.max(0, Number(sp.sixMonths) || 0),
      yearly: Math.max(0, Number(sp.yearly) || 0),
      customMonths: Array.isArray(sp.customMonths)
        ? sp.customMonths.map((cm) => ({
            months: Math.min(12, Math.max(1, Number(cm.months) || 1)),
            price: Math.max(0, Number(cm.price) || 0),
          }))
        : [],
    };
  } else if (customPrice > 0) {
    ground.customSubscriptionPricing = {
      oneMonth: Math.round(customPrice * 10),
      threeMonths: Math.round(customPrice * 27),
      sixMonths: Math.round(customPrice * 50),
      yearly: Math.round(customPrice * 90),
      customMonths: [],
    };
  }

  syncLegacySportFields(ground);
  if (ground.venueType !== 'pool') {
    syncGroundAutomatedSlots(ground, 14);
  }
  await ground.save();

  res.status(201).json(ground);
});

// Owner sees ALL their grounds (including pending/rejected) so they know status
const getMyGrounds = asyncHandler(async (req, res) => {
  const grounds = await Ground.find({ owner: req.user._id });
  for (const g of grounds) {
    if (g.venueType !== 'pool') {
      const modified = syncGroundAutomatedSlots(g, 14);
      if (modified) await g.save().catch(() => {});
    }
  }

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

  for (const g of grounds) {
    if (g.venueType !== 'pool') {
      const modified = syncGroundAutomatedSlots(g, 14);
      if (modified) await g.save().catch(() => {});
    }
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

  if (ground.venueType !== 'pool') {
    const modified = syncGroundAutomatedSlots(ground, 14);
    if (modified) {
      await ground.save().catch(() => {});
    }
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
  const { name, address, coordinates, longitude, latitude, amenities, isSocial, venueType, description, images, sport, pricePerHour } = req.body;
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  const coords = Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(Number(coordinates[0])) && !isNaN(Number(coordinates[1]))
    ? [Number(coordinates[0]), Number(coordinates[1])]
    : (longitude !== undefined && latitude !== undefined && !isNaN(parseFloat(longitude)) && !isNaN(parseFloat(latitude))
        ? [parseFloat(longitude), parseFloat(latitude)]
        : null);

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
    if (isSocial) ground.venueType = 'social';
  }
  if (coords) ground.location = { type: 'Point', coordinates: coords };

  // Update sport & standard price per hour
  if (pricePerHour !== undefined) {
    const parsedPrice = Math.max(0, Number(pricePerHour) || 0);
    ground.pricePerHour = parsedPrice;
    if (Array.isArray(ground.sports) && ground.sports.length > 0) {
      ground.sports[0].pricePerHour = parsedPrice;
    }
  }
  if (sport && typeof sport === 'string' && sport.trim()) {
    const trimmedSport = sport.trim().toLowerCase();
    ground.sport = trimmedSport;
    if (Array.isArray(ground.sports) && ground.sports.length > 0) {
      ground.sports[0].name = trimmedSport;
    }
  }

  if (req.body.customPricePerHour !== undefined) {
    const cp = Math.max(0, Number(req.body.customPricePerHour) || 0);
    ground.customPricePerHour = cp;
    if (Array.isArray(ground.sports) && ground.sports.length > 0) {
      ground.sports[0].customPricePerHour = cp;
    }
  }
  if (req.body.pricingPreference !== undefined) {
    if (['normal', 'custom'].includes(req.body.pricingPreference)) {
      ground.pricingPreference = req.body.pricingPreference;
      if (Array.isArray(ground.sports) && ground.sports.length > 0) {
        ground.sports[0].pricingPreference = req.body.pricingPreference;
      }
    }
  }
  if (req.body.bookingRequestsEnabled !== undefined && ground.venueType !== 'pool') {
    ground.bookingRequestsEnabled = Boolean(req.body.bookingRequestsEnabled);
  }
  if (req.body.customPricingTypes && typeof req.body.customPricingTypes === 'object') {
    ground.customPricingTypes = {
      hourly: req.body.customPricingTypes.hourly !== false,
      subscription: req.body.customPricingTypes.subscription !== false,
    };
    if (Array.isArray(ground.sports) && ground.sports.length > 0) {
      ground.sports[0].customPricingTypes = ground.customPricingTypes;
    }
  }
  if (Array.isArray(req.body.customHourlyPricing)) {
    ground.customHourlyPricing = req.body.customHourlyPricing.map((item) => ({
      hours: Math.max(1, Number(item.hours) || 1),
      price: Math.max(0, Number(item.price) || 0),
      label: item.label || '',
    }));
    const oneHour = ground.customHourlyPricing.find((h) => Number(h.hours) === 1);
    if (oneHour && oneHour.price > 0) ground.customPricePerHour = oneHour.price;
  }
  if (req.body.customSubscriptionPricing && typeof req.body.customSubscriptionPricing === 'object') {
    const sp = req.body.customSubscriptionPricing;
    ground.customSubscriptionPricing = {
      oneMonth: Math.max(0, Number(sp.oneMonth) || 0),
      threeMonths: Math.max(0, Number(sp.threeMonths) || 0),
      sixMonths: Math.max(0, Number(sp.sixMonths) || 0),
      yearly: Math.max(0, Number(sp.yearly) || 0),
      customMonths: Array.isArray(sp.customMonths)
        ? sp.customMonths.map((cm) => ({
            months: Math.min(12, Math.max(1, Number(cm.months) || 1)),
            price: Math.max(0, Number(cm.price) || 0),
          }))
        : [],
    };
  }

  await ground.save();
  res.json(ground);
});

// Quick endpoint for venue owners to toggle preference (normal vs custom) and set hourly / subscription pricing
const updatePricingPreference = asyncHandler(async (req, res) => {
  const {
    pricingPreference,
    customPricePerHour,
    customHourlyPricing,
    customSubscriptionPricing,
    customPricingTypes,
  } = req.body;
  const query = req.user.role === 'admin'
    ? { _id: req.params.id }
    : { _id: req.params.id, owner: req.user._id };

  const ground = await Ground.findOne(query);
  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  if (pricingPreference !== undefined) {
    if (!['normal', 'custom'].includes(pricingPreference)) {
      res.status(400);
      throw new Error("pricingPreference must be either 'normal' or 'custom'");
    }
    ground.pricingPreference = pricingPreference;
    if (Array.isArray(ground.sports) && ground.sports.length > 0) {
      ground.sports[0].pricingPreference = pricingPreference;
    }
  }

  if (customPricingTypes && typeof customPricingTypes === 'object') {
    ground.customPricingTypes = {
      hourly: customPricingTypes.hourly !== false,
      subscription: customPricingTypes.subscription !== false,
    };
    if (Array.isArray(ground.sports) && ground.sports.length > 0) {
      ground.sports[0].customPricingTypes = ground.customPricingTypes;
    }
  }

  if (customPricePerHour !== undefined) {
    ground.customPricePerHour = Math.max(0, Number(customPricePerHour) || 0);
  }

  if (Array.isArray(customHourlyPricing)) {
    ground.customHourlyPricing = customHourlyPricing.map((item) => ({
      hours: Math.max(1, Number(item.hours) || 1),
      price: Math.max(0, Number(item.price) || 0),
      label: item.label || '',
    }));
    const oneHour = ground.customHourlyPricing.find((h) => Number(h.hours) === 1);
    if (oneHour && oneHour.price > 0) {
      ground.customPricePerHour = oneHour.price;
    }
  }

  if (customSubscriptionPricing && typeof customSubscriptionPricing === 'object') {
    const sp = customSubscriptionPricing;
    ground.customSubscriptionPricing = {
      oneMonth: Math.max(0, Number(sp.oneMonth) || 0),
      threeMonths: Math.max(0, Number(sp.threeMonths) || 0),
      sixMonths: Math.max(0, Number(sp.sixMonths) || 0),
      yearly: Math.max(0, Number(sp.yearly) || 0),
      customMonths: Array.isArray(sp.customMonths)
        ? sp.customMonths.map((cm) => ({
            months: Math.min(12, Math.max(1, Number(cm.months) || 1)),
            price: Math.max(0, Number(cm.price) || 0),
          }))
        : [],
    };
  }

  await ground.save();
  res.json({
    message: 'Pricing preferences and plans updated successfully',
    ground,
  });
});

const deleteGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  if (ground.venueType === 'pool') {
    await PoolConfig.deleteOne({ ground: ground._id });
    await PoolBookingSlot.deleteMany({ ground: ground._id });
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

  for (const g of grounds) {
    if (g.venueType !== 'pool') {
      const modified = syncGroundAutomatedSlots(g, 14);
      if (modified) await g.save().catch(() => {});
    }
  }

  grounds = grounds.map(withoutStaleSlots);

  res.json(scrubNestedPhone(grounds, 'owner', req.user._id));
});


// ── Automated Weekly Schedule & Overrides (Swimming Pool Model) ──────────

const getGroundSchedule = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  syncGroundAutomatedSlots(ground, 14);
  await ground.save().catch(() => {});

  res.json({
    weeklySchedule: ground.weeklySchedule || [],
    overrideDates: ground.overrideDates || [],
    slots: ground.slots || [],
    sports: ground.sports || [],
  });
});

const toggleScheduleBlock = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const { dayOfWeek, startTime, endTime, sportId, courtId, applyToAllDays } = req.body;
  if (!startTime || !endTime) {
    res.status(400); throw new Error('startTime and endTime are required');
  }

  const updated = await toggleWeeklyBlock(ground, {
    dayOfWeek,
    startTime,
    endTime,
    sportId,
    courtId,
    applyToAllDays: !!applyToAllDays,
  });

  res.json(updated);
});

const overrideDateStart = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const updated = await startOverrideDate(ground, req.params.date);
  res.json(updated);
});

const overrideDateRevert = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  const updated = await revertOverrideDate(ground, req.params.date);
  res.json(updated);
});

const resetScheduleDefaults = asyncHandler(async (req, res) => {
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });
  if (!ground) { res.status(404); throw new Error('Ground not found or unauthorized'); }

  ground.weeklySchedule = buildDefaultWeeklyBlocks(ground.sports);
  ground.overrideDates = [];
  const today = todayStr();
  ground.slots = (ground.slots || []).filter((s) => s.isBooked || (s.bookedCount || 0) > 0 || s.date < today);
  syncGroundAutomatedSlots(ground, 14);
  await ground.save();

  res.json(ground);
});

// ── Venue Owner Booking Requests Toggle ──────────────────────────────────
const toggleBookingRequests = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) {
    res.status(404);
    throw new Error('Ground not found');
  }

  // Swimming pool is strictly excluded
  if (ground.venueType === 'pool') {
    res.status(400);
    throw new Error('Booking requests are not available for swimming pool venues');
  }

  // Authorization check: owner or admin
  const isOwner = req.user.role === 'admin' || String(ground.owner?._id || ground.owner) === String(req.user._id);
  if (!isOwner) {
    res.status(403);
    throw new Error('Not authorized to modify this ground');
  }

  const requestedVal = req.body.bookingRequestsEnabled !== undefined
    ? Boolean(req.body.bookingRequestsEnabled)
    : !ground.bookingRequestsEnabled;

  ground.bookingRequestsEnabled = requestedVal;
  await ground.save();

  res.json({
    success: true,
    bookingRequestsEnabled: ground.bookingRequestsEnabled,
    message: ground.bookingRequestsEnabled
      ? 'Booking requests enabled! Users must send a booking request (Stage 5) before paying (Stage 6).'
      : 'Direct booking enabled! Users can book and pay directly (5 Stages).',
    ground: withoutStaleSlots(ground),
  });
});

export {
  createGround, getMyGrounds, getNearbyGrounds, getAllGrounds, getGroundById,
  addSport, updateSport, removeSport, addCourt, updateCourt, removeCourt,
  addSlots, removeSlot, updateGround, updatePricingPreference, toggleBookingRequests, deleteGround,
  getGroundSchedule, toggleScheduleBlock, overrideDateStart, overrideDateRevert, resetScheduleDefaults,
};
