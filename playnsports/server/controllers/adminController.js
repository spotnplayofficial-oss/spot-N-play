import asyncHandler from 'express-async-handler';
import Coach from '../models/Coach.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Ground from '../models/Ground.js';
import Event from '../models/Event.js';
import Contact from '../models/Contact.js';
import {
  getEventsForAdmin,
  approveEvent,
  rejectEvent,
} from './eventController.js';

// ── Coaches ──────────────────────────────────────────────

const getAllCoaches = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const coaches = await Coach.find(query).populate('user', 'name email avatar').sort('-createdAt');
  res.json(coaches);
});

const approveCoach = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) { res.status(404); throw new Error('Coach not found'); }
  coach.status = 'approved';
  coach.rejectionReason = '';
  await coach.save();
  await User.findByIdAndUpdate(coach.user, { role: 'coach' });
  res.json({ message: 'Coach approved ✅', coach });
});

const rejectCoach = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) { res.status(404); throw new Error('Coach not found'); }
  coach.status = 'rejected';
  coach.rejectionReason = req.body.reason || 'Application rejected';
  await coach.save();
  res.json({ message: 'Coach rejected', coach });
});

// ── Stats ─────────────────────────────────────────────────

const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers, totalCoaches, pendingCoaches, approvedCoaches,
    totalGrounds, socialGrounds, pendingGrounds,
    totalBookings, pendingApprovals, completedBookings, cancelledBookings,
    playerCount, groundOwnerCount,
    totalEvents, pendingEvents, approvedEvents,
    totalContacts, newContacts,
  ] = await Promise.all([
    User.countDocuments(),
    Coach.countDocuments(),
    Coach.countDocuments({ status: 'pending' }),
    Coach.countDocuments({ status: 'approved' }),
    Ground.countDocuments(),
    Ground.countDocuments({ isSocial: true }),
    Ground.countDocuments({ approvalStatus: 'pending' }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'pending_approval' }),
    Booking.countDocuments({ status: 'completed' }),
    Booking.countDocuments({ status: 'cancelled' }),
    User.countDocuments({ role: 'player' }),
    User.countDocuments({ role: 'ground_owner' }),
    Event.countDocuments(),
    Event.countDocuments({ approvalStatus: 'pending' }),
    Event.countDocuments({ approvalStatus: 'approved' }),
    Contact.countDocuments(),
    Contact.countDocuments({ status: 'new' }),
  ]);

  res.json({
    totalUsers, totalCoaches, pendingCoaches, approvedCoaches,
    totalGrounds, socialGrounds, pendingGrounds,
    totalBookings, pendingApprovals, completedBookings, cancelledBookings,
    playerCount, groundOwnerCount,
    totalEvents, pendingEvents, approvedEvents,
    totalContacts, newContacts,
  });
});

// ── Contact / "Get in touch" messages ────────────────────

const getAllContactMessages = asyncHandler(async (req, res) => {
  const contacts = await Contact.find({})
    .populate('user', 'name avatar role email')
    .sort({ createdAt: -1 });
  res.json(contacts);
});

const markContactMessageRead = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) { res.status(404); throw new Error('Message not found'); }
  contact.status = 'read';
  await contact.save();
  res.json({ success: true });
});

// ── Ground Approvals ──────────────────────────────────────

const getPendingGrounds = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const grounds = await Ground.find({ approvalStatus: status })
    .populate('owner', 'name email phone avatar')
    .sort('-createdAt');
  res.json(grounds);
});

const approveGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }
  ground.isApproved = true;
  ground.approvalStatus = 'approved';
  ground.rejectionReason = '';
  await ground.save();
  res.json({ message: 'Ground approved ✅', ground });
});

const rejectGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findById(req.params.id);
  if (!ground) { res.status(404); throw new Error('Ground not found'); }
  ground.isApproved = false;
  ground.approvalStatus = 'rejected';
  ground.rejectionReason = req.body.reason || 'Application rejected';
  await ground.save();
  res.json({ message: 'Ground rejected', ground });
});

// ── Social Booking Approvals ──────────────────────────────

const getPendingSocialBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ status: 'pending_approval' })
    .populate('player', 'name email phone avatar')
    .populate('ground', 'name address sport isSocial')
    .sort({ createdAt: -1 });
  res.json(bookings);
});

const approveSocialBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('ground');
  if (!booking) { res.status(404); throw new Error('Booking not found'); }

  const ground = await Ground.findById(booking.ground._id);
  const slot = ground.slots.id(booking.slot);
  if (slot) {
    slot.isBooked = true;
    slot.bookedBy = booking.player;
    await ground.save();
  }

  booking.status = 'completed';
  await booking.save();

  res.json({ message: 'Booking approved ✅', booking });
});

const rejectSocialBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) { res.status(404); throw new Error('Booking not found'); }

  const ground = await Ground.findById(booking.ground);
  if (ground) {
    ground.slots = ground.slots.filter(s => s._id.toString() !== booking.slot.toString());
    await ground.save();
  }

  booking.status = 'cancelled';
  await booking.save();

  res.json({ message: 'Booking rejected', booking });
});

// ── Users ─────────────────────────────────────────────────

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort('-createdAt');
  res.json(users);
});

const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  user.isActive = !user.isActive;
  await user.save();
  res.json({ message: `User ${user.isActive ? 'activated' : 'banned'}`, isActive: user.isActive });
});

// ── All Bookings ──────────────────────────────────────────

const getAllBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const bookings = await Booking.find(query)
    .populate('player', 'name email phone')
    .populate('ground', 'name address sport')
    .sort('-createdAt')
    .limit(100);
  res.json(bookings);
});

export {
  getAllCoaches, approveCoach, rejectCoach, getDashboardStats,
  getPendingGrounds, approveGround, rejectGround,
  getPendingSocialBookings, approveSocialBooking, rejectSocialBooking,
  getAllUsers, toggleUserActive, getAllBookings,
  getEventsForAdmin, approveEvent, rejectEvent,
  getAllContactMessages, markContactMessageRead,
};