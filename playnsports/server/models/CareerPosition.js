import mongoose from 'mongoose';

const careerPositionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: 'Team' },
    location: { type: String, trim: true, default: 'Phagwara / Remote' },
    type: { type: String, trim: true, default: 'Internship' },
    description: { type: String, required: true, trim: true },
    requirements: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

careerPositionSchema.index({ active: 1, createdAt: -1 });

export default mongoose.model('CareerPosition', careerPositionSchema);
