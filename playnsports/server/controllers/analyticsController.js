import User from "../models/User.js";
import Ground, { SPORT_NAMES } from "../models/Ground.js";

// Baseline offset so the historical 640-player mark starts at 720 and
// automatically increments (+1) every time a new player registers.
const PLAYER_BASE_OFFSET = 80;

export const getStats = async (req, res) => {
  try {
    const players = await User.countDocuments({ role: 'player' });
    const grounds = await Ground.countDocuments({ approvalStatus: { $ne: 'rejected' } });
    const sports = Array.isArray(SPORT_NAMES) ? SPORT_NAMES.length : 32;

    res.json({
      players: players + PLAYER_BASE_OFFSET,
      grounds,
      sports,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};