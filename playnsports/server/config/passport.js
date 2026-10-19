import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5005}`;

const verifyGoogleUser = async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile?.emails?.[0]?.value?.toLowerCase()?.trim();
    if (!email) {
      console.error('❌ Google profile missing email address:', profile);
      return done(new Error('No email found in Google account'), null);
    }

    console.log(`🔍 Verifying Google login for: ${email}`);
    let user = await User.findOne({ email });

    let isNewUser = false;
    let needsSave = false;
    if (!user) {
      isNewUser = true;
      console.log(`👤 Creating new player for Google email: ${email}`);
      user = await User.create({
        name: profile.displayName || 'Player',
        email: email,
        password: Math.random().toString(36),
        role: 'player',
        avatar: profile.photos?.[0]?.value || '',
        phone: '',
        isEmailVerified: true,
        hasPassword: false,
        authProvider: 'google',
        activeDays: [],
        bookedDays: [],
      });
    } else {
      if (!user.phone || user.phone.trim() === '') {
        isNewUser = true;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        needsSave = true;
      }
      if (user.authProvider !== 'both' && user.authProvider !== 'google') {
        user.authProvider = user.hasPassword ? 'both' : 'google';
        needsSave = true;
      }
    }
    user._isNewUser = isNewUser;

    // Defensive array checks
    if (!Array.isArray(user.activeDays)) {
      user.activeDays = [];
      needsSave = true;
    }
    if (!Array.isArray(user.bookedDays)) {
      user.bookedDays = [];
      needsSave = true;
    }

    // ── streak logic (mirrors loginUser) ──
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const last = user.lastLoginDate;

    if (last !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];

      if (last === yStr) {
        user.loginStreak = (user.loginStreak || 0) + 1;
      } else {
        user.loginStreak = 1; // reset
      }

      user.longestStreak = Math.max(user.longestStreak || 0, user.loginStreak);
      user.lastLoginDate = today;

      if (!user.activeDays.includes(today)) {
        user.activeDays.push(today);
      }

      needsSave = true;
    }

    if (needsSave) await user.save();

    console.log(`✅ Google user verified successfully: ${user.email} (${user._id})`);
    return done(null, user);
  } catch (err) {
    console.error('❌ Error in verifyGoogleUser:', err);
    return done(err, null);
  }
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Web Strategy
  passport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${backendUrl}/api/auth/google/callback`,
    proxy: true,
  }, verifyGoogleUser));

  // Dedicated Mobile / Android App Strategy
  passport.use('google-app', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${backendUrl}/api/auth/google/app/callback`,
    proxy: true,
  }, verifyGoogleUser));
} else {
  console.log("⚠️ Google OAuth disabled (no client ID/secret)");
}

export default passport;