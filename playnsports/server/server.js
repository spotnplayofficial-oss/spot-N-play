import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sanitize from 'mongo-sanitize';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import groundRoutes from './routes/groundRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { socketHandler } from './socket/socketHandler.js';
import passport from './config/passport.js';
import coachRoutes from './routes/coachRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { setIO } from './socket/io.js';

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

// ── Allowed origins ──────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

const corsOrigin = (origin, callback) => {
  // Allow no-origin requests (mobile apps, Postman in dev) and whitelisted origins.
  if (!origin) return callback(null, true);
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    (process.env.NODE_ENV !== 'production' && origin === 'http://localhost:5173');
  if (allowed) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

// ── Security headers (helmet) ─────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
  contentSecurityPolicy: false, // CSP is handled by the frontend build
}));

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Body parsing with size limits ────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Strip MongoDB operator injection from query/body/params ──────
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  // Don't touch req.query (read-only in Express 5), filter at controller level
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────

// Strict limit for auth endpoints (prevent brute-force / credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP endpoints — even tighter (prevent OTP flooding / SMS abuse)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  message: { message: 'Too many OTP requests. Please wait 10 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload endpoints — prevent storage abuse
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 20,
  message: { message: 'Upload rate limit reached. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter — permissive but guards against DoS
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 200,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/' || req.path === '/api', // skip health-checks
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/otp', otpLimiter);
app.use('/api/upload', uploadLimiter);

// ── Passport ──────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Socket.io ─────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

setIO(io); // let controllers/services emit real-time notifications via getIO()
socketHandler(io);

// ── Health checks ─────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'PLAYNSPORTS API running 🚀' }));
app.get('/api', (req, res) => res.json({ message: 'API is working 🚀' }));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/grounds', groundRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geocode', geocodeRoutes);

// ── Error handler ─────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT} 🟢`));
