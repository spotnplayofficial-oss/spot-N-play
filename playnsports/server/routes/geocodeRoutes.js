import express from 'express';
import { reverseGeocode } from '../controllers/geocodeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/reverse', protect, reverseGeocode);

export default router;
