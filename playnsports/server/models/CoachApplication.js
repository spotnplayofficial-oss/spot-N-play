import mongoose from 'mongoose';

const coachApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    sport: { type: String, required: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'approved', 'rejected'],
      default: 'pending',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('CoachApplication', coachApplicationSchema);
