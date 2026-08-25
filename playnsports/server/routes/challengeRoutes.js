import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  completeChallenge,
  createChallenge,
  getChallengeById,
  getChallenges,
  joinChallenge,
  scoreParticipant,
  submitScore,
  updateChallenge,
} from '../controllers/challengeController.js';

const router = express.Router();

router.route('/')
  .get(getChallenges)
  .post(protect, createChallenge);

router.route('/:id')
  .get(protect, getChallengeById)
  .patch(protect, updateChallenge);

router.post('/:id/join', protect, joinChallenge);
router.post('/:id/submit', protect, submitScore);
router.patch('/:id/score/:participantId', protect, scoreParticipant);
router.patch('/:id/complete', protect, completeChallenge);

export default router;
