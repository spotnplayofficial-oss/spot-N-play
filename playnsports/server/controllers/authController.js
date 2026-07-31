import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { updateStreak } from '../utils/updateStreak.js';

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide all required fields (name, email, password)');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password is too short. It must be at least 6 characters long.');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({ name, email, password, role, phone });
  await updateStreak(user);

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    token: generateToken(user._id, user.role),
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    res.status(401); throw new Error('Invalid email or password');
  }

  await updateStreak(user);

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    loginStreak: user.loginStreak,
    token: generateToken(user._id, user.role),
  });
});



const getMe = asyncHandler(async (req, res) => {
  let user = await User.findById(req.user._id).select('-password');
  if (user) {
    user = await updateStreak(user);
  }
  res.json(user);
});

export { registerUser, loginUser, getMe };