import express from 'express';
import { getVenues, getVenueById, claimTrial, checkInLead, getMyLeads } from '../controllers/venueController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// NOTE: '/my/leads' must be declared before '/:id' or Express will try to
// treat 'my' as a venue id.
router.get('/my/leads', protect, authorizeRoles('ground_owner', 'gym_owner', 'pool_owner'), getMyLeads);

router.get('/', optionalProtect, getVenues);
router.get('/:id', optionalProtect, getVenueById);
router.post('/:id/claim-trial', protect, claimTrial);
router.patch('/:id/checkin', protect, authorizeRoles('ground_owner', 'gym_owner', 'pool_owner', 'admin'), checkInLead);

export default router;
