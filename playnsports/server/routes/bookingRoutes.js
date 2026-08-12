import express from 'express';
import {
  getMyBookings,
  getGroundBookings,
  cancelBooking,
  bookGroundSlot,
  bookSocialGroundSlot,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/my', protect, authorizeRoles('player'), getMyBookings);
router.get('/grounds/:id', protect, authorizeRoles('ground_owner', 'pool_owner', 'admin'), getGroundBookings);
router.post('/grounds/:id/book', protect, authorizeRoles('player'), bookGroundSlot);
router.post('/grounds/:id/book-social', protect, authorizeRoles('player'), bookSocialGroundSlot);
router.patch('/:id/cancel', protect, authorizeRoles('player'), cancelBooking);

export default router;