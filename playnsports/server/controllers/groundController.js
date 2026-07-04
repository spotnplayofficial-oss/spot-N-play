import asyncHandler from 'express-async-handler';
import Ground from '../models/Ground.js';

const createGround = asyncHandler(async (req, res) => {
  const { name, sport, address, pricePerHour, coordinates, longitude, latitude, amenities, isSocial } = req.body;
  const coords = coordinates || [parseFloat(longitude), parseFloat(latitude)];

  const ground = await Ground.create({
    owner: req.user._id,
    name,
    sport,
    address,
    pricePerHour,
    location: { type: 'Point', coordinates: coords },
    amenities: amenities || [],
    isSocial: isSocial || false,
    isApproved: false,
    approvalStatus: 'pending',
  });

  res.status(201).json(ground);
});

// Owner sees ALL their grounds (including pending/rejected) so they know status
const getMyGrounds = asyncHandler(async (req, res) => {
  const grounds = await Ground.find({ owner: req.user._id });
  res.json(grounds);
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

  if (sport) query.sport = sport;

  let grounds = await Ground.find(query).populate('owner', 'name phone');

  if (name && name.trim()) {
    const term = name.trim().toLowerCase();
    grounds = grounds.filter(g => g.name?.toLowerCase().includes(term));
  }

  res.json(grounds);
});

const getGroundById = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id).populate('owner', 'name phone avatar');

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found');
  }

  res.json(ground);
});

const addSlots = asyncHandler(async (req, res) => {
  const { slots } = req.body;

  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  if (ground.approvalStatus !== 'approved') {
    res.status(403);
    throw new Error('Cannot add slots — ground is not yet approved by admin');
  }

  ground.slots.push(...slots);
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

  if (slot.isBooked) {
    res.status(400);
    throw new Error('Cannot remove a slot that is already booked');
  }

  ground.slots = ground.slots.filter(s => s._id.toString() !== req.params.slotId);
  await ground.save();

  res.json(ground);
});

const updateGround = asyncHandler(async (req, res) => {
  const { name, sport, address, pricePerHour, coordinates, longitude, latitude, amenities, isSocial } = req.body;
  const ground = await Ground.findOne({ _id: req.params.id, owner: req.user._id });

  if (!ground) {
    res.status(404);
    throw new Error('Ground not found or unauthorized');
  }

  const coords = coordinates || (longitude && latitude ? [parseFloat(longitude), parseFloat(latitude)] : null);

  ground.name = name || ground.name;
  ground.sport = sport || ground.sport;
  ground.address = address || ground.address;
  if (pricePerHour !== undefined) ground.pricePerHour = pricePerHour;
  ground.amenities = amenities || ground.amenities;
  if (isSocial !== undefined) ground.isSocial = isSocial;
  if (coords) ground.location = { type: 'Point', coordinates: coords };

  // If approved ground is edited, send back to pending so admin re-reviews
  // (optional UX choice — comment out if you don't want this)
  // ground.approvalStatus = 'pending';
  // ground.isApproved = false;

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
  if (sport) query.sport = sport;

  let grounds = await Ground.find(query).populate('owner', 'name phone');

  if (name && name.trim()) {
    const term = name.trim().toLowerCase();
    grounds = grounds.filter(g => g.name?.toLowerCase().includes(term));
  }

  res.json(grounds);
});

export { createGround, getMyGrounds, getNearbyGrounds, getAllGrounds, getGroundById, addSlots, removeSlot, updateGround, deleteGround };