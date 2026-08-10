import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: req.file.path },
    { new: true }
  ).select('-password');

  res.json({
    message: 'Avatar uploaded successfully ✅',
    avatar: user.avatar,
    user,
  });
});

// Certificate / document upload — returns the Cloudinary URL
const uploadCertificate = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  res.json({
    message: 'Certificate uploaded successfully ✅',
    fileUrl: req.file.path, // Cloudinary URL
  });
});

// Event banner image upload — returns the Cloudinary URL
const uploadEventImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  res.json({
    message: 'Image uploaded successfully ✅',
    fileUrl: req.file.path, // Cloudinary URL
  });
});

// Venue images come in as multiple files at once (cover + gallery), unlike
// the single-file avatar/event uploads above.
const uploadVenueImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('No files uploaded');
  }

  res.json({
    message: 'Images uploaded successfully ✅',
    fileUrls: req.files.map((f) => f.path), // Cloudinary URLs
  });
});

const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: '' },
    { new: true }
  ).select('-password');

  res.json({
    message: 'Avatar removed ✅',
    avatar: user.avatar,
    user,
  });
});

export { uploadAvatar, uploadCertificate, uploadEventImage, uploadVenueImages, removeAvatar };