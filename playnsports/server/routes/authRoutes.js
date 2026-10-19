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
  completeGoogleProfile,
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

// First-time Google profile completion
router.post('/google/complete-profile', protect, completeGoogleProfile);

// Helper to build encoded user object for redirection
const buildAuthUserPayload = (user, token, isNew = false) => {
  return encodeURIComponent(JSON.stringify({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    avatar: user.avatar || '',
    isEmailVerified: !!user.isEmailVerified,
    isPhoneVerified: !!user.isPhoneVerified,
    isNewUser: !!isNew,
    token: token,
  }));
};

// ── Google OAuth: Web ────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err || !user) {
      console.error('❌ Google web auth failed:', err || info);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
    try {
      const token = generateToken(user._id, user.role);
      const userPayload = buildAuthUserPayload(user, token);
      console.log(`✅ Google web auth success for ${user.email}`);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?token=${token}&user=${userPayload}`);
    } catch (e) {
      console.error('❌ Error in google web callback redirect:', e);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  })(req, res, next);
});

// ── Google OAuth: Mobile / Android App ────────────────────────────────────────
router.get('/google/app', passport.authenticate('google-app', {
  scope: ['profile', 'email'],
  session: false,
}));

router.get('/google/app/callback', (req, res, next) => {
  console.log('📥 Received Google App OAuth callback with query:', req.query);
  passport.authenticate('google-app', { session: false }, (err, user, info) => {
    if (err || !user) {
      console.error('❌ Google App auth failed:', err || info);
      const errMsg = err?.message || info?.message || 'authentication_failed';
      const failUrl = `sportsnplay://auth/google/failure?error=${encodeURIComponent(errMsg)}`;
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Authentication Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; background: #0f172a; color: #fff; text-align: center; padding: 40px 20px; }
            .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #ef4444; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Authentication Failed</h2>
          <p>${errMsg}</p>
          <a class="btn" href="${failUrl}">Return to spotNplay</a>
          <script>
            window.location.href = "${failUrl}";
          </script>
        </body>
        </html>
      `);
    }
    try {
      const isNew = !!user._isNewUser || !user.phone || user.phone.trim() === '';
      const token = generateToken(user._id, user.role);
      const userPayload = buildAuthUserPayload(user, token, isNew);
      console.log(`✅ Google App auth success for ${user.email} (isNew: ${isNew}), returning auto-redirect page`);

      const appSuccessUrl = `sportsnplay://auth/google/success?token=${token}&user=${userPayload}`;
      const intentUrl = `intent://auth/google/success?token=${token}&user=${userPayload}#Intent;scheme=sportsnplay;package=com.example.sportsnplay;end`;

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Redirecting to spotNplay...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #0b1320;
              color: #f8fafc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
              text-align: center;
            }
            .card {
              background: #1e293b;
              border-radius: 20px;
              padding: 36px 28px;
              max-width: 380px;
              width: 100%;
              box-shadow: 0 20px 40px rgba(0,0,0,0.5);
              border: 1px solid rgba(255,255,255,0.08);
            }
            .spinner {
              width: 44px;
              height: 44px;
              border: 4px solid rgba(255,255,255,0.1);
              border-top-color: #10b981;
              border-radius: 50%;
              animation: spin 0.9s infinite linear;
              margin: 0 auto 20px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { margin: 0 0 10px; font-size: 22px; font-weight: 700; color: #ffffff; }
            p { color: #94a3b8; font-size: 14px; margin: 0 0 24px; }
            .btn {
              display: block;
              padding: 14px 24px;
              background: #10b981;
              color: #ffffff;
              text-decoration: none;
              border-radius: 12px;
              font-size: 15px;
              font-weight: 600;
              box-shadow: 0 4px 14px rgba(16,185,129,0.4);
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>Sign-In Successful!</h2>
            <p>Returning to spotNplay app...</p>
            <a class="btn" id="openBtn" href="${appSuccessUrl}">Open spotNplay</a>
          </div>
          <script>
            // Automatically launch app
            window.location.href = "${appSuccessUrl}";
            setTimeout(function() {
              window.location.href = "${intentUrl}";
            }, 600);
          </script>
        </body>
        </html>
      `);
    } catch (e) {
      console.error('❌ Error in google app callback redirect:', e);
      return res.redirect(`sportsnplay://auth/google/failure?error=${encodeURIComponent(e.message)}`);
    }
  })(req, res, next);
});

export default router;

