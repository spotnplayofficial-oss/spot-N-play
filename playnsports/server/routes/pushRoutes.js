import express from 'express';
import { getPublicKey, subscribe, unsubscribe } from '../controllers/pushController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/vapid-key', getPublicKey);
router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);

export default router;
