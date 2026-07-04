import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  updateMyProfile,
  getMyStreak,
  getPublicProfile,
  getAllUsers,
} from '../controllers/userController.js';

const router = express.Router();

router.post('/block/:id', protect, blockUser);
router.post('/unblock/:id', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);
router.patch('/profile', protect, updateMyProfile);
router.get('/streak', protect, getMyStreak);
router.get('/all', protect, getAllUsers);

// Public profile — must come after named routes to avoid /:id swallowing them
router.get('/:id/profile', protect, getPublicProfile);

export default router;
