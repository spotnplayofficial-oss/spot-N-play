import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  applyAsCoach,
  getMyCoachProfile,
  updateCoachProfile,
  getApprovedCoaches,
  getCoachById,
  submitPublicCoachApplication,
} from '../controllers/coachController.js';

const router = express.Router();

router.get('/', getApprovedCoaches);
router.get('/me', protect, getMyCoachProfile);
router.get('/:id', getCoachById);
router.post('/apply', protect, applyAsCoach);
router.post('/apply-public', submitPublicCoachApplication);
router.post('/join', submitPublicCoachApplication);
router.put('/me', protect, updateCoachProfile);

export default router;