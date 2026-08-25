import mongoose from 'mongoose';

// A head-to-head challenge between two players.
// Created by the challenger from the opponent's profile ("Challenge this
// player" button). The opponent accepts / declines; once accepted either
// side can report the result (winner or draw), which closes the challenge.
const playerChallengeSchema = new mongoose.Schema(
  {
    challenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    opponent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sport: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // Proposed date ('YYYY-MM-DD') + time ('HH:mm') — optional; blank means
    // "let's figure out a time together".
    proposedDate: { type: String, default: '' },
    proposedTime: { type: String, default: '' },
    // Where they'd play — free text (ground name, area, "online", …).
    venue: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '', maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'completed'],
      default: 'pending',
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null on draw
    resultNote: { type: String, trim: true, default: '' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

playerChallengeSchema.index({ opponent: 1, status: 1 });
playerChallengeSchema.index({ challenger: 1, status: 1 });

export default mongoose.model('PlayerChallenge', playerChallengeSchema);
