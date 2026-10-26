import express from 'express';
import {
  getXlInfo,
  createMembershipOrder,
  verifyMembershipPayment,
  createArenaBookingRequest,
  getMyArenaRequestStatus,
  respondToArenaBookingRequest,
  createArenaOrder,
  verifyArenaPayment,
} from '../controllers/xlArenaController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Arena info (plans + my membership) — any logged-in user can view.
router.get('/:groundId/info', protect, getXlInfo);
// Membership purchase — players only, full payment via Razorpay.
router.post('/:groundId/membership/order', protect, authorizeRoles('player'), createMembershipOrder);
router.post('/:groundId/membership/verify', protect, authorizeRoles('player'), verifyMembershipPayment);

// Step 5: Arena booking request (player submits request -> venue owner approves)
router.post('/:groundId/booking-request', protect, authorizeRoles('player'), createArenaBookingRequest);
router.get('/:groundId/my-request-status', protect, authorizeRoles('player'), getMyArenaRequestStatus);
router.patch('/:groundId/booking-requests/:bookingId/respond', protect, respondToArenaBookingRequest);

// Step 6: Arena turf payment (multi continuous slots, full/token payment).
router.post('/:groundId/arena-order', protect, authorizeRoles('player'), createArenaOrder);
router.post('/:groundId/arena-verify', protect, authorizeRoles('player'), verifyArenaPayment);

export default router;
