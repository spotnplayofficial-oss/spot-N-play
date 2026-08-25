import asyncHandler from 'express-async-handler';
import OTP from '../models/OTP.js';
import User from '../models/User.js';
import { sendOTPEmail } from '../utils/sendEmail.js';

const domains = () => (process.env.LPU_EMAIL_DOMAINS || 'lpu.in,student.lpu.in')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const isLpuEmail = (email) => {
  const clean = String(email || '').trim().toLowerCase();
  return domains().some((domain) => clean.endsWith(`@${domain}`));
};

const sendLpuOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const registrationNumber = String(req.body.registrationNumber || '').trim();
  if (!email || !isLpuEmail(email)) {
    res.status(400);
    throw new Error(`Use a valid LPU email (${domains().map((d) => `@${d}`).join(', ')})`);
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await OTP.deleteMany({ email, channel: 'lpu_email' });
  await OTP.create({ email, channel: 'lpu_email', otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  await sendOTPEmail(email, otp);
  await User.findByIdAndUpdate(req.user._id, {
    lpuEmail: email,
    lpuRegistrationNumber: registrationNumber,
    lpuVerificationStatus: 'pending',
  });
  res.json({ message: 'LPU verification OTP sent' });
});

const verifyLpuOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const record = await OTP.findOne({ email, channel: 'lpu_email' });
  if (!record || new Date() > record.expiresAt) {
    res.status(400);
    throw new Error('OTP expired or not found. Please request a new one.');
  }
  if (String(record.otp).trim() !== otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }
  await OTP.deleteOne({ _id: record._id });
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error('User not found'); }
  user.lpuEmail = email;
  user.lpuRegistrationNumber = String(req.body.registrationNumber || user.lpuRegistrationNumber || '').trim();
  user.lpuVerified = true;
  user.lpuVerificationStatus = 'verified';
  user.lpuVerifiedAt = new Date();
  await user.save();
  res.json({
    message: 'LPU verification complete',
    lpuVerified: user.lpuVerified,
    lpuEmail: user.lpuEmail,
    lpuRegistrationNumber: user.lpuRegistrationNumber,
    lpuVerificationStatus: user.lpuVerificationStatus,
    lpuVerifiedAt: user.lpuVerifiedAt,
  });
});

const getMyLpuStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('lpuVerified lpuEmail lpuRegistrationNumber lpuVerificationStatus lpuVerifiedAt');
  res.json(user);
});

export { sendLpuOtp, verifyLpuOtp, getMyLpuStatus };
