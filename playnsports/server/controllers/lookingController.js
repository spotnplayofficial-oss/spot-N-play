import asyncHandler from 'express-async-handler';
import LookingRequest from '../models/LookingRequest.js';
import Player from '../models/Player.js';
import { getIO } from '../socket/io.js';
import { notifyNearbyGameRequest, notifyGameRequestJoined, notifyGameRequestJoinConfirmed, notifySquadReady } from '../services/notificationService.js';
import { sendBgusInvites as sendLftWhatsapp } from '../utils/whatsappService.js';

// How far around a new request we look for players to notify. Kept as a
// plain constant (not user-configurable) — same "fetch nearby, keep it
// simple" spirit as the rest of the map/players endpoints in this app.
const NOTIFY_RADIUS_METERS = 15000; // 15 km

const broadcast = (event, payload) => {
  const io = getIO();
  if (io) io.to('live-requests').emit(event, payload);
};

const populateRequest = (query) =>
  query.populate('user', 'name avatar phone').populate('playersJoined', 'name avatar phone').populate('playersJoinedInfo.user', 'name avatar phone');

// GET /api/looking — active requests, for initial load (real-time updates
// after that arrive over the `live-requests` socket room)
const getActiveRequests = asyncHandler(async (req, res) => {
  const requests = await populateRequest(
    LookingRequest.find({ status: { $in: ['active', 'full'] }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 })
  );
  res.json(requests);
});

// POST /api/looking — create a request, broadcast it live, notify nearby players
const createRequest = asyncHandler(async (req, res) => {
  const { sport, lat, lng, locationName, ground, skillLevel, playersNeeded, scheduledFor, duration, note, bgmiId } = req.body;

  if (!sport || lat == null || lng == null || !playersNeeded || !scheduledFor) {
    res.status(400);
    throw new Error('sport, location, playersNeeded and scheduledFor are required');
  }

  const scheduledDate = new Date(scheduledFor);
  const durationMinutes = Number(duration) || 60;
  const expiresAt = new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);

  if (expiresAt <= new Date()) {
    res.status(400);
    throw new Error('Scheduled time has already passed');
  }

  const request = await LookingRequest.create({
    user: req.user._id,
    sport,
    location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
    locationName: locationName || '',
    ground: ground || null,
    skillLevel: skillLevel || 'any',
    playersNeeded: Number(playersNeeded),
    scheduledFor: scheduledDate,
    duration: durationMinutes,
    note: note || '',
    bgmiId: (bgmiId || '').toString().trim(),
    expiresAt,
  });

  const populated = await populateRequest(LookingRequest.findById(request._id));

  broadcast('request:created', populated);

  // Notify nearby players who play this sport — best-effort, never blocks
  // the response (createRequest already returns below regardless).
  (async () => {
    try {
      const nearbyPlayers = await Player.find({
        sport: sport.toLowerCase(),
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
            $maxDistance: NOTIFY_RADIUS_METERS,
          },
        },
      }).populate('user', '_id').limit(200);

      const recipientIds = nearbyPlayers
        .map((p) => p.user?._id?.toString())
        .filter((id) => id && id !== req.user._id.toString());

      await Promise.all(
        [...new Set(recipientIds)].map((recipientId) =>
          notifyNearbyGameRequest({
            requestId: request._id,
            recipientId,
            organizerId: req.user._id,
            organizerName: req.user.name,
            sport,
            playersNeeded: request.playersNeeded,
            locationName: locationName || '',
          })
        )
      );
    } catch (err) {
      console.error('Nearby game request notify failed:', err.message);
    }
  })();

  res.status(201).json(populated);
});

// POST /api/looking/:id/join
const joinRequest = asyncHandler(async (req, res) => {
  const request = await LookingRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (request.status !== 'active') {
    res.status(400);
    throw new Error('This request is no longer accepting players');
  }
  if (request.user.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You can't join your own request");
  }
  if (request.playersJoined.some((id) => id.toString() === req.user._id.toString())) {
    res.status(400);
    throw new Error('Already joined');
  }

  request.playersJoined.push(req.user._id);
  if (!request.playersJoinedInfo) request.playersJoinedInfo = [];
  request.playersJoinedInfo.push({ user: req.user._id, bgmiId: (req.body.bgmiId || '').toString().trim() });
  if (request.playersJoined.length >= request.playersNeeded) {
    request.status = 'full';
  }
  await request.save();

  const populated = await populateRequest(LookingRequest.findById(request._id));

  broadcast(request.status === 'full' ? 'request:full' : 'request:joined', populated);

  notifyGameRequestJoined({
    requestId: request._id,
    organizerId: request.user,
    joinerId: req.user._id,
    joinerName: req.user.name,
    sport: request.sport,
  });

  // Also notify the joiner (you joined) — so the requester sees feedback
  notifyGameRequestJoinConfirmed({
    requestId: request._id,
    joinerId: req.user._id,
    organizerId: request.user,
    organizerName: populated.user?.name || 'Organizer',
    sport: request.sport,
  });

  // If squad is now full, notify all members that they can book BGUS
  if (request.status === 'full') {
    const allIds = [request.user, ...request.playersJoined].map((id) => id.toString());
    notifySquadReady({
      requestId: request._id,
      memberIds: [...new Set(allIds)],
      organizerName: populated.user?.name || 'Organizer',
      sport: request.sport,
    });
  }

  res.json(populated);
});

// POST /api/looking/:id/cancel — organizer cancels their own request
const cancelRequest = asyncHandler(async (req, res) => {
  const request = await LookingRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (request.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  request.status = 'cancelled';
  await request.save();

  broadcast('request:cancelled', { _id: request._id.toString() });

  res.json({ message: 'Cancelled' });
});

export { getActiveRequests, createRequest, joinRequest, cancelRequest };
