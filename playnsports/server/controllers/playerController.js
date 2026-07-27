import asyncHandler from 'express-async-handler';
import Player from '../models/Player.js';
import User from '../models/User.js';
import { scrubNestedPhone } from '../utils/phonePrivacy.js';

// ── existing ───────────────────────────────────────────────

const setAvailability = asyncHandler(async (req, res) => {
  const { sport, skillLevel, bio, latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    res.status(400);
    throw new Error('Location is required. Please allow location access.');
  }

  const player = await Player.findOneAndUpdate(
    { user: req.user._id },
    {
      user: req.user._id,
      sport,
      skillLevel,
      bio,
      isAvailable: true,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.json(player);
});

const getNearbyPlayers = asyncHandler(async (req, res) => {
  const { longitude, latitude, radius = 5000, sport, skillLevel, name } = req.query;

  // Hard-cap radius at 100 km (100,000 m) to prevent abuse / huge DB scans
  const safeRadius = Math.min(Math.abs(parseFloat(radius) || 5000), 100000);

  const query = {
    isAvailable: true,
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
  if (skillLevel) query.skillLevel = skillLevel;

  let players = await Player.find(query).populate('user', 'name phone hidePhoneNumber avatar gender');

  // A Player doc can outlive its linked User if the user was ever removed
  // directly in the database instead of through the app's account-deletion
  // flow — populate() then resolves `user` to null. Drop those here so
  // every consumer (map, chat invites, etc.) can safely assume player.user
  // is always a real object.
  players = players.filter(p => p.user);

  // Client-side name filter after geo-query (case-insensitive substring)
  if (name && name.trim()) {
    const term = name.trim().toLowerCase();
    players = players.filter(p => p.user?.name?.toLowerCase().includes(term));
  }

  res.json(scrubNestedPhone(players, 'user', req.user._id));
});

const getAllPlayers = asyncHandler(async (req, res) => {
  const { sport, skillLevel, name } = req.query;

  const query = { isAvailable: true };
  if (sport) query.sport = sport;
  if (skillLevel) query.skillLevel = skillLevel;

  let players = await Player.find(query).populate('user', 'name phone hidePhoneNumber avatar gender');

  // Same orphan guard as getNearbyPlayers above.
  players = players.filter(p => p.user);

  if (name && name.trim()) {
    const term = name.trim().toLowerCase();
    players = players.filter(p => p.user?.name?.toLowerCase().includes(term));
  }

  res.json(scrubNestedPhone(players, 'user', req.user._id));
});

const getMyProfile = asyncHandler(async (req, res) => {
  const player = await Player.findOne({ user: req.user._id }).populate('user', 'name phone hidePhoneNumber isEmailVerified isPhoneVerified avatar gender city state bio dateOfBirth country');
  if (!player) return res.json(null);
  res.json(player);
});

const deleteAvailability = asyncHandler(async (req, res) => {
  const player = await Player.findOne({ user: req.user._id });
  if (!player) {
    res.status(404);
    throw new Error('Player profile not found');
  }
  player.isAvailable = false;
  await player.save();
  res.json({ message: 'You are now offline' });
});

// ── new: update full player profile ──────────────────────

const updatePlayerProfile = asyncHandler(async (req, res) => {
  const {
    // User-level fields
    name, phone, hidePhoneNumber, gender, dateOfBirth, city, state, country, bio,
    // Player-level fields
    height, weight, sports, achievements, instagram, twitter,
  } = req.body;

  // 1. Update User document
  const userUpdates = {};
  if (name !== undefined) userUpdates.name = name;
  if (phone !== undefined) {
    userUpdates.phone = phone;
    // A changed phone number is no longer the one that was verified
    const existing = await User.findById(req.user._id).select('phone');
    if (existing && existing.phone !== phone) userUpdates.isPhoneVerified = false;
  }
  if (hidePhoneNumber !== undefined) userUpdates.hidePhoneNumber = hidePhoneNumber;
  if (gender !== undefined) userUpdates.gender = gender;
  if (dateOfBirth !== undefined) userUpdates.dateOfBirth = dateOfBirth || null;
  if (city !== undefined) userUpdates.city = city;
  if (state !== undefined) userUpdates.state = state;
  if (country !== undefined) userUpdates.country = country;
  if (bio !== undefined) userUpdates.bio = bio;

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(req.user._id, userUpdates);
  }

  // 2. Update or create Player document (upsert)
  const playerUpdates = {};
  if (height !== undefined) playerUpdates.height = height;
  if (weight !== undefined) playerUpdates.weight = weight;
  if (sports !== undefined) playerUpdates.sports = sports;
  if (achievements !== undefined) playerUpdates.achievements = achievements;
  if (instagram !== undefined) playerUpdates.instagram = instagram;
  if (twitter !== undefined) playerUpdates.twitter = twitter;
  if (bio !== undefined) playerUpdates.bio = bio;

  // Set primary sport/skillLevel from first sports entry if sports array updated
  if (sports && sports.length > 0) {
    playerUpdates.sport = sports[0].name;
    playerUpdates.skillLevel = sports[0].level;
  }

  let player = await Player.findOne({ user: req.user._id });

  if (player) {
    Object.assign(player, playerUpdates);
    await player.save();
  } else {
    // Player doc doesn't exist yet — create minimal one (no location required for profile-only)
    player = await Player.create({
      user: req.user._id,
      sport: sports?.[0]?.name || 'cricket',
      skillLevel: sports?.[0]?.level || 'beginner',
      location: { type: 'Point', coordinates: [0, 0] },
      ...playerUpdates,
    });
  }

  const updated = await Player.findOne({ user: req.user._id })
    .populate('user', 'name phone hidePhoneNumber isEmailVerified isPhoneVerified avatar gender city state bio dateOfBirth country');
  res.json(updated);
});

// ── new: add certificate to player profile ────────────────

const addCertificate = asyncHandler(async (req, res) => {
  const { title, fileUrl } = req.body;
  if (!title || !fileUrl) {
    res.status(400);
    throw new Error('Title and file URL required');
  }

  const player = await Player.findOne({ user: req.user._id });
  if (!player) {
    res.status(404);
    throw new Error('Player profile not found');
  }

  player.certificates.push({ title, fileUrl });
  await player.save();
  res.json(player.certificates);
});

// ── new: remove certificate ───────────────────────────────

const removeCertificate = asyncHandler(async (req, res) => {
  const player = await Player.findOne({ user: req.user._id });
  if (!player) {
    res.status(404);
    throw new Error('Player profile not found');
  }

  player.certificates = player.certificates.filter(
    c => c._id.toString() !== req.params.certId
  );
  await player.save();
  res.json(player.certificates);
});

export {
  setAvailability,
  getNearbyPlayers,
  getAllPlayers,
  getMyProfile,
  deleteAvailability,
  updatePlayerProfile,
  addCertificate,
  removeCertificate,
};