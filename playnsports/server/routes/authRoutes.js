import express from 'express';
import passport from 'passport';
import {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
  setupPassword,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import generateToken from '../utils/generateToken.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Password Management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/setup-password', protect, setupPassword);
router.patch('/change-password', protect, changePassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login`, session: false }),
  (req, res) => {
    const token = generateToken(req.user._id, req.user.role);
    const user = encodeURIComponent(JSON.stringify({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
      avatar: req.user.avatar,
      isEmailVerified: req.user.isEmailVerified,
      isPhoneVerified: req.user.isPhoneVerified,
      hasPassword: req.user.hasPassword,
      authProvider: req.user.authProvider || 'google',
    }));
    res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?token=${token}&user=${user}`);
  }
);

export default router;