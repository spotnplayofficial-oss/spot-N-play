import mongoose from 'mongoose';

const collaborationInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    organization: { type: String, trim: true, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    inquiryType: { type: String, trim: true, default: 'Partnership' },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['new', 'read', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

export default mongoose.model('CollaborationInquiry', collaborationInquirySchema);
