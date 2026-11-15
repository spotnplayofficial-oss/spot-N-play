import mongoose from 'mongoose';

const venueInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sports: [{ type: String, trim: true }],
    locationAddress: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    questions: { type: String, trim: true, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['new', 'contacted', 'approved', 'rejected'],
      default: 'new',
    },
  },
  { timestamps: true }
);

export default mongoose.model('VenueInquiry', venueInquirySchema);
