import asyncHandler from 'express-async-handler';
import Coach from '../models/Coach.js';
import CoachApplication from '../models/CoachApplication.js';
import CollaborationInquiry from '../models/CollaborationInquiry.js';
import User from '../models/User.js';
import { scrubPhoneField, toPlain } from '../utils/phonePrivacy.js';
import { notifyMany } from '../services/notificationService.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';

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

// Submit public coach application (accessible before login)
const submitPublicCoachApplication = asyncHandler(async (req, res) => {
  const { name, email, phone, sport, qualification } = req.body;

  if (!name || !email || !phone || !sport || !qualification) {
    res.status(400);
    throw new Error('Please provide name, email, mobile number, sport, and qualification.');
  }

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = String(phone).trim();
  const cleanSport = String(sport).trim();
  const cleanQual = String(qualification).trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    res.status(400);
    throw new Error('Please provide a valid email address.');
  }

  // Find linked user if already registered
  const existingUser = await User.findOne({ email: cleanEmail });

  // Create CoachApplication record
  const application = await CoachApplication.create({
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    sport: cleanSport,
    qualification: cleanQual,
    user: existingUser ? existingUser._id : null,
    status: 'pending',
  });

  // Also sync to CollaborationInquiry so growth/admin inbox sees it immediately
  try {
    await CollaborationInquiry.create({
      name: cleanName,
      organization: 'Coach Applicant',
      email: cleanEmail,
      phone: cleanPhone,
      inquiryType: 'Coach Application',
      message: `Sport: ${cleanSport}\nQualification: ${cleanQual}\nMobile: ${cleanPhone}`,
    });
  } catch (syncErr) {
    console.error('Failed to sync coach application to CollaborationInquiry:', syncErr);
  }

  // Notify admins
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins && admins.length > 0) {
      await notifyMany(admins.map(a => a._id), {
        type: NOTIFICATION_TYPES?.NEW_COACH_APPLICATION || 'new_coach_application',
        title: 'New Coach Application',
        body: `${cleanName} applied as coach for ${cleanSport} (${cleanQual})`,
        link: '/admin',
        data: { applicationId: application._id, email: cleanEmail, sport: cleanSport },
      });
    }
  } catch (notifyErr) {
    console.error('Failed to notify admins of coach application:', notifyErr);
  }

  res.status(201).json({
    success: true,
    message: 'Thank you! Your coach application has been submitted successfully.',
    application,
  });
});

// Admin: Get public coach applications
const getPublicCoachApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const apps = await CoachApplication.find(query).populate('user', 'name email avatar').sort({ createdAt: -1 });
  res.json(apps);
});

export {
  applyAsCoach,
  getMyCoachProfile,
  updateCoachProfile,
  getApprovedCoaches,
  getCoachById,
  submitPublicCoachApplication,
  getPublicCoachApplications,
};