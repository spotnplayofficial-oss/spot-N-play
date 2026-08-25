import mongoose from 'mongoose';

const challengeParticipantSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamName: { type: String, trim: true, default: '' },
    score: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    status: { type: String, enum: ['registered', 'submitted', 'approved', 'disqualified'], default: 'registered' },
  },
  { timestamps: true }
);

challengeParticipantSchema.index({ challenge: 1, user: 1 }, { unique: true });
challengeParticipantSchema.index({ challenge: 1, rank: 1 });

export default mongoose.model('ChallengeParticipant', challengeParticipantSchema);
