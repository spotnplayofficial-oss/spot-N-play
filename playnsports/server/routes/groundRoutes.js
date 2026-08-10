import express from 'express';
import {
  createGround,
  getMyGrounds,
  getNearbyGrounds,
  getAllGrounds,
  getGroundById,
  addSport,
  updateSport,
  removeSport,
  addCourt,
  updateCourt,
  removeCourt,
  addSlots,
  removeSlot,
  updateGround,
  deleteGround,
} from '../controllers/groundController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const VENUE_OWNER_ROLES = ['ground_owner', 'gym_owner', 'pool_owner'];

router.post('/', protect, authorizeRoles(...VENUE_OWNER_ROLES), createGround);
router.get('/my', protect, authorizeRoles(...VENUE_OWNER_ROLES), getMyGrounds);
router.get('/nearby', protect, getNearbyGrounds);
router.get('/all', protect, getAllGrounds);
router.get('/:id', protect, getGroundById);

// Sport & court management — venue owners configure what's bookable
router.post('/:id/sports', protect, authorizeRoles(...VENUE_OWNER_ROLES), addSport);
router.put('/:id/sports/:sportId', protect, authorizeRoles(...VENUE_OWNER_ROLES), updateSport);
router.delete('/:id/sports/:sportId', protect, authorizeRoles(...VENUE_OWNER_ROLES), removeSport);
router.post('/:id/sports/:sportId/courts', protect, authorizeRoles(...VENUE_OWNER_ROLES), addCourt);
router.put('/:id/sports/:sportId/courts/:courtId', protect, authorizeRoles(...VENUE_OWNER_ROLES), updateCourt);
router.delete('/:id/sports/:sportId/courts/:courtId', protect, authorizeRoles(...VENUE_OWNER_ROLES), removeCourt);

router.post('/:id/slots', protect, authorizeRoles(...VENUE_OWNER_ROLES), addSlots);
router.delete('/:id/slots/:slotId', protect, authorizeRoles(...VENUE_OWNER_ROLES), removeSlot);
router.put('/:id', protect, authorizeRoles(...VENUE_OWNER_ROLES), updateGround);
router.delete('/:id', protect, authorizeRoles(...VENUE_OWNER_ROLES), deleteGround);

export default router;
