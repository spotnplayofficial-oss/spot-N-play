import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  // Exactly one of these is set, depending on `channel`.
  email: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  channel: {
    type: String,
    enum: ['email', 'phone', 'lpu_email'],
    default: 'email',
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000),
  },
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OTP', otpSchema);
