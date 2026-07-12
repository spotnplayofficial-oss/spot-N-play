import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ email: profile.emails[0].value });

      let needsSave = false;
      if (!user) {
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          password: Math.random().toString(36),
          role: 'player',
          avatar: profile.photos[0]?.value || '',
          phone: '',
          isEmailVerified: true,
        });
      } else if (!user.isEmailVerified) {
        user.isEmailVerified = true;
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

      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }));
} else {
  console.log("⚠️ Google OAuth disabled (no client ID/secret)");
}

export default passport;