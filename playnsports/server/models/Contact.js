import mongoose from 'mongoose';

// A simple message from a logged-in user to the admin team, sent from the
// "Get in Touch" section on the home page. Admins see these listed in the
// admin panel like an inbox — name + message, newest first.
const contactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['new', 'read'],
      default: 'new',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Contact', contactSchema);
