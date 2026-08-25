import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createChallenge,
  getMyChallenges,
  respondChallenge,
  cancelChallenge,
  reportResult,
} from '../controllers/playerChallengeController.js';

const router = express.Router();

router.use(protect);

// Specific routes first
router.get('/mine', getMyChallenges);

router.post('/', createChallenge);
router.patch('/:id/respond', respondChallenge);
router.patch('/:id/cancel', cancelChallenge);
router.patch('/:id/result', reportResult);

export default router;
