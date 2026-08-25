import mongoose from 'mongoose';

const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'platform' },
    androidUrl: { type: String, trim: true, default: '' },
    iosUrl: { type: String, trim: true, default: '' },
    whatsappNumber: { type: String, trim: true, default: '' },
    whatsappMessage: { type: String, trim: true, default: 'Hi SpotNPlay, I need help.' },
    contactEmail: { type: String, trim: true, default: 'spotnplayofficial@gmail.com' },
    collaborationEmail: { type: String, trim: true, default: 'spotnplayofficial@gmail.com' },
    instagramUrl: { type: String, trim: true, default: 'https://instagram.com/spotnplayofficial' },
  },
  { timestamps: true }
);

export default mongoose.model('SiteSetting', siteSettingSchema);
