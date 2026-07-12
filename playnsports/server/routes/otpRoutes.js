import express from 'express';
import { sendOTP, verifyOTP, checkUser, sendPhoneOTP, verifyPhoneOTP } from '../controllers/otpController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send', sendOTP);
router.post('/verify', verifyOTP);
router.post('/check', checkUser);

// Phone verification — used right after signup (once logged in) and from
// Profile Settings for any existing account.
router.post('/send-phone', protect, sendPhoneOTP);
router.post('/verify-phone', protect, verifyPhoneOTP);

export default router;
