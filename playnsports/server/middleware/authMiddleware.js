import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found 🔴' });
      }

      return next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token failed 🔴' });
      }
      // A database or other unexpected error, not a bad token — pass it to
      // the global error handler instead of reporting it as an auth failure.
      return next(error);
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token 🔴' });
  }
};

export { protect };