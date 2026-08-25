import mongoose from 'mongoose';

const challengeSubmissionSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'ChallengeParticipant', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proofUrl: { type: String, trim: true, default: '' },
    submittedScore: { type: Number, default: 0 },
    note: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model('ChallengeSubmission', challengeSubmissionSchema);
