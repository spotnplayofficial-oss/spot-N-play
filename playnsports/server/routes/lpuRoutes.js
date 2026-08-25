import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMyLpuStatus, sendLpuOtp, verifyLpuOtp } from '../controllers/lpuController.js';

const router = express.Router();

router.get('/me', protect, getMyLpuStatus);
router.post('/send-otp', protect, sendLpuOtp);
router.post('/verify-otp', protect, verifyLpuOtp);

export default router;
