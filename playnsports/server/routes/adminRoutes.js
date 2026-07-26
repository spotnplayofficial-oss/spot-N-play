import express from 'express';
import {
  getAllCoaches, approveCoach, rejectCoach, getDashboardStats,
  getPendingGrounds, approveGround, rejectGround,
  getPendingSocialBookings, approveSocialBooking, rejectSocialBooking,
  getAllUsers, toggleUserActive, getAllBookings,
  getEventsForAdmin, approveEvent, rejectEvent,
  getAllContactMessages, markContactMessageRead,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const admin = [protect, authorizeRoles('admin')];

router.get('/stats', ...admin, getDashboardStats);

// Coaches
router.get('/coaches', ...admin, getAllCoaches);
router.patch('/coaches/:id/approve', ...admin, approveCoach);
router.patch('/coaches/:id/reject', ...admin, rejectCoach);

// Grounds approval
router.get('/grounds', ...admin, getPendingGrounds);
router.patch('/grounds/:id/approve', ...admin, approveGround);
router.patch('/grounds/:id/reject', ...admin, rejectGround);

// Social bookings
router.get('/social-bookings/pending', ...admin, getPendingSocialBookings);
router.patch('/social-bookings/:id/approve', ...admin, approveSocialBooking);
router.patch('/social-bookings/:id/reject', ...admin, rejectSocialBooking);

// Users
router.get('/users', ...admin, getAllUsers);
router.patch('/users/:id/toggle-active', ...admin, toggleUserActive);

// Bookings
router.get('/bookings', ...admin, getAllBookings);

// Events approval
router.get('/events', ...admin, getEventsForAdmin);
router.patch('/events/:id/approve', ...admin, approveEvent);
router.patch('/events/:id/reject', ...admin, rejectEvent);

// Contact / "Get in touch" messages
router.get('/contact', ...admin, getAllContactMessages);
router.patch('/contact/:id/read', ...admin, markContactMessageRead);

export default router;