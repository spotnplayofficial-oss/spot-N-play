import express from 'express';
import { removeAvatar, uploadAvatar, uploadCertificate, uploadEventImage, uploadVenueImages } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload, uploadEvent, uploadVenue } from '../config/cloudinary.js';

const router = express.Router();

router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/certificate', protect, upload.single('certificate'), uploadCertificate);
router.post('/event', protect, uploadEvent.single('image'), uploadEventImage);
router.post('/venue', protect, uploadVenue.array('images', 6), uploadVenueImages);
router.delete('/avatar',protect,removeAvatar);

export default router;
