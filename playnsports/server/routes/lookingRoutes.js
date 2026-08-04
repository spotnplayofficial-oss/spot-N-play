import express from 'express';
import { getActiveRequests, createRequest, joinRequest, cancelRequest } from '../controllers/lookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getActiveRequests);
router.post('/', protect, createRequest);
router.post('/:id/join', protect, joinRequest);
router.post('/:id/cancel', protect, cancelRequest);

export default router;
