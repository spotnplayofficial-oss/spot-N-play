import asyncHandler from 'express-async-handler';
import Contact from '../models/Contact.js';

// POST /api/contact — any logged-in user can send a short message to admins
const submitContact = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error('Message cannot be empty');
  }
  if (message.trim().length > 2000) {
    res.status(400);
    throw new Error('Message is too long (max 2000 characters)');
  }

  const contact = await Contact.create({
    user: req.user._id,
    message: message.trim(),
  });

  const populated = await Contact.findById(contact._id).populate('user', 'name avatar role email');

  res.status(201).json(populated);
});

export { submitContact };
