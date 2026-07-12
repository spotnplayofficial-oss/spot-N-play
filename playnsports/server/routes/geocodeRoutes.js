import express from 'express';
import { reverseGeocode, reverseGeocodeBatch } from '../controllers/geocodeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/reverse', protect, reverseGeocode);
router.post('/reverse-batch', protect, reverseGeocodeBatch);

export default router;
