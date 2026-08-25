import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ['sports', 'esports'], default: 'sports' },
    sport: { type: String, trim: true, default: '' },
    gameTitle: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true },
    rules: { type: String, trim: true, default: '' },
    challengeType: { type: String, enum: ['solo', 'team'], default: 'solo' },
    scoringType: { type: String, enum: ['manual', 'time', 'points'], default: 'manual' },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    registrationDeadline: { type: String, default: '' },
    maxParticipants: { type: Number, default: 0 },
    entryFee: { type: Number, default: 0 },
    prizePool: { type: Number, default: 0 },
    streamUrl: { type: String, trim: true, default: '' },
    lpuOnly: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'open', 'live', 'completed', 'cancelled'], default: 'open' },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, trim: true, default: '' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    winners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

challengeSchema.index({ approvalStatus: 1, status: 1, startDate: 1 });

export default mongoose.model('Challenge', challengeSchema);
