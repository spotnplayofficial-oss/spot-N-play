import mongoose from 'mongoose';

const careerApplicationSchema = new mongoose.Schema(
  {
    position: { type: mongoose.Schema.Types.ObjectId, ref: 'CareerPosition', default: null },
    positionTitle: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    resumeUrl: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['new', 'reviewing', 'shortlisted', 'rejected'], default: 'new' },
  },
  { timestamps: true }
);

export default mongoose.model('CareerApplication', careerApplicationSchema);
