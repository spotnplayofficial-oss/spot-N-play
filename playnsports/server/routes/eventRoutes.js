import express from 'express';
import {
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
} from '../controllers/eventController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Specific routes first (must come before "/:id")
router.get('/my', protect, getMyEvents);
router.get('/joined', protect, getJoinedEvents);

router.route('/')
  .get(protect, getEvents)
  .post(protect, createEvent);

router.route('/:id')
  .get(protect, getEventById)
  .put(protect, updateEvent);

router.patch('/:id/cancel', protect, cancelEvent);

router.post('/:id/join', protect, joinEvent);
router.post('/:id/leave', protect, leaveEvent);
router.patch('/:id/checkin', protect, checkInParticipant);

router.post('/:id/pay/order', protect, createEventOrder);
router.post('/:id/pay/verify', protect, verifyEventPayment);

export default router;