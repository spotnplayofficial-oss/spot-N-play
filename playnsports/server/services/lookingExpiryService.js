import LookingRequest from '../models/LookingRequest.js';

const SWEEP_INTERVAL_MS = 15000; // 15s — frequent enough to feel real-time, cheap enough to run forever

// Flips any request whose time has passed from active/full → expired, and
// tells everyone live so the map/dashboard remove it immediately instead
// of relying on Mongo's own (much slower, non-realtime) TTL cleanup.
export const startExpirySweep = (io) => {
  const sweep = async () => {
    try {
      const now = new Date();
      const expiring = await LookingRequest.find({
        status: { $in: ['active', 'full'] },
        expiresAt: { $lte: now },
      }).select('_id');

      if (expiring.length === 0) return;

      const ids = expiring.map((r) => r._id);
      await LookingRequest.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } });

      ids.forEach((id) => {
        io.to('live-requests').emit('request:expired', { _id: id.toString() });
      });
    } catch (err) {
      console.error('Looking-request expiry sweep failed:', err.message);
    }
  };

  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  sweep(); // catch anything that expired while the server was down/restarting

  return () => clearInterval(interval);
};
