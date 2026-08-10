import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'playnsports/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const eventStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'playnsports/events',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const venueStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'playnsports/venues',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

export const upload = multer({ storage });
export const uploadEvent = multer({ storage: eventStorage });
export const uploadVenue = multer({ storage: venueStorage });
export default cloudinary;