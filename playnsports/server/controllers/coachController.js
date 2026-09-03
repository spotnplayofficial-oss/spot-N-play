import asyncHandler from 'express-async-handler';
import Coach from '../models/Coach.js';
import { scrubPhoneField, toPlain } from '../utils/phonePrivacy.js';

// Apply as coach
const applyAsCoach = asyncHandler(async (req, res) => {
  const existing = await Coach.findOne({ user: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error('You have already applied as a coach');
  }

  const {
    fullName, username, phone, dateOfBirth, gender,
    state, city, country, sport, experience,
    coachingLevel, certifications, bio, hourlyRate,
  } = req.body;

  const usernameExists = await Coach.findOne({ username });
  if (usernameExists) {
    res.status(400);
    throw new Error('Username already taken');
  }

  const coach = await Coach.create({
    user: req.user._id,
    fullName, username, phone, dateOfBirth, gender,
    state, city, country, sport, experience,
    coachingLevel, certifications, bio,
    hourlyRate: hourlyRate || 0,
    avatar: req.user.avatar || '',
    status: 'pending',
  });

  res.status(201).json(coach);
});

// Get my coach profile
const getMyCoachProfile = asyncHandler(async (req, res) => {
  const coach = await Coach.findOne({ user: req.user._id });
  if (!coach) return res.json(null);
  res.json(coach);
});

// Update my coach profile
const updateCoachProfile = asyncHandler(async (req, res) => {
  let coach = await Coach.findOne({ user: req.user._id });
  if (!coach) {
    coach = await Coach.create({
      user: req.user._id,
      fullName: req.user.name || 'Coach',
      username: req.user.email ? req.user.email.split('@')[0] : `coach_${Date.now()}`,
      phone: req.user.phone || '',
      avatar: req.user.avatar || '',
      status: 'approved',
    });
  }

  const fields = [
    'fullName', 'username', 'phone', 'hidePhoneNumber', 'dateOfBirth', 'gender',
    'state', 'city', 'country', 'sport', 'experience', 'coachingLevel',
    'certifications', 'bio', 'hourlyRate', 'avatar'
  ];
  fields.forEach(f => { if (req.body[f] !== undefined) coach[f] = req.body[f]; });
  await coach.save();
  res.json(coach);
});

// Get all approved coaches (public)
const getApprovedCoaches = asyncHandler(async (req, res) => {
  const { sport } = req.query;
  const query = { status: { $ne: 'rejected' } };
  if (sport && sport !== 'All Sports') {
    query.sport = { $regex: new RegExp(`^${sport}$`, 'i') };
  }
  const coaches = await Coach.find(query).populate('user', 'name avatar email').sort('-createdAt');
  const plain = toPlain(coaches).map((c) => scrubPhoneField(c, req.user?._id, c.user?._id || c.user));
  res.json(plain);
});

// Get single coach profile (public)
const getCoachById = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id).populate('user', 'name avatar email');
  if (!coach) { res.status(404); throw new Error('Coach not found'); }
  const plain = scrubPhoneField(toPlain(coach), req.user?._id, coach.user?._id || coach.user);
  res.json(plain);
});

export { applyAsCoach, getMyCoachProfile, updateCoachProfile, getApprovedCoaches, getCoachById };