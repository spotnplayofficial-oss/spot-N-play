import mongoose from 'mongoose';

const sportEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'box cricket', 'box football', 'hockey'],
    required: true,
    set: v => v ? v.toLowerCase() : v,
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'professional'],
    default: 'beginner',
    set: v => v ? v.toLowerCase() : v,
  },
  yearsPlayed: { type: Number, default: 0 },
}, { _id: true });

const certificateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const playerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── primary sport for map/availability (kept for backward compat) ──
    sport: {
      type: String,
      enum: ['football', 'cricket', 'basketball', 'tennis', 'badminton', 'volleyball', 'boxing', 'box cricket', 'box football', 'hockey'],
      required: true,
      set: v => v ? v.toLowerCase() : v,
    },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional'],
      default: 'beginner',
      set: v => v ? v.toLowerCase() : v,
    },

    // ── availability ──
    isAvailable: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    bio: { type: String, trim: true, default: '' },

    // ── extended sports profile ──
    sports: [sportEntrySchema],           // multiple sports
    height: { type: Number, default: null },  // cm
    weight: { type: Number, default: null },  // kg
    achievements: [{ type: String, trim: true }],
    certificates: [certificateSchema],

    // ── socials ──
    instagram: { type: String, trim: true, default: '' },
    twitter: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

playerSchema.index({ location: '2dsphere' });

export default mongoose.model('Player', playerSchema);