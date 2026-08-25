import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

faqSchema.index({ active: 1, order: 1, createdAt: -1 });

export default mongoose.model('FAQ', faqSchema);
