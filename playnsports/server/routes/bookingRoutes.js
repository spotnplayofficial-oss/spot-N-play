import express from 'express';
import {
  getMyBookings,
  getGroundBookings,
  cancelBooking,
  bookGroundSlot,
  bookSocialGroundSlot,
  extendSocialBooking,
  getTeamUpBookings,
  sendTeamUpRequest,
  getMyTeamUpRequests,
  respondToTeamUpRequest,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/my', protect, authorizeRoles('player'), getMyBookings);
router.get('/grounds/:id', protect, authorizeRoles('ground_owner', 'pool_owner', 'admin'), getGroundBookings);
router.post('/grounds/:id/book', protect, authorizeRoles('player'), bookGroundSlot);
router.post('/grounds/:id/book-social', protect, authorizeRoles('player'), bookSocialGroundSlot);
router.post('/:id/extend', protect, authorizeRoles('player'), extendSocialBooking);
router.get('/grounds/:id/team-ups', protect, authorizeRoles('player'), getTeamUpBookings);
router.get('/grounds/:id/my-team-up-requests', protect, authorizeRoles('player'), getMyTeamUpRequests);
router.post('/grounds/:id/team-up-request', protect, authorizeRoles('player'), sendTeamUpRequest);
router.patch('/team-up-requests/:requestId/respond', protect, authorizeRoles('player'), respondToTeamUpRequest);
router.patch('/:id/cancel', protect, authorizeRoles('player'), cancelBooking);

export default router;