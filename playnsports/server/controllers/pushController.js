import asyncHandler from 'express-async-handler';
import PushSubscription from '../models/PushSubscription.js';
import { getVapidPublicKey } from '../services/webPush.js';

// GET /api/push/vapid-key — frontend needs this to call pushManager.subscribe()
const getPublicKey = asyncHandler(async (req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(503).json({ message: 'Push notifications are not configured on this server' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe — save (or refresh) a browser's push subscription
const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys, userAgent } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400);
    throw new Error('Invalid push subscription payload');
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user._id, endpoint, keys, userAgent: userAgent || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ message: 'Subscribed' });
});

// POST /api/push/unsubscribe — e.g. user turns notifications off in-app
const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400);
    throw new Error('endpoint is required');
  }
  await PushSubscription.deleteOne({ endpoint, user: req.user._id });
  res.json({ message: 'Unsubscribed' });
});

export { getPublicKey, subscribe, unsubscribe };
