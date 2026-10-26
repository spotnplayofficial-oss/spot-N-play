import User from "../models/User.js";
import Ground, { SPORT_NAMES } from "../models/Ground.js";

export const getStats = async (req, res) => {
  try {
    const players = await User.countDocuments({ role: 'player' });
    const grounds = await Ground.countDocuments({ approvalStatus: { $ne: 'rejected' } });
    const sports = Array.isArray(SPORT_NAMES) ? SPORT_NAMES.length : 32;

    res.json({
      players: Math.max(players, 840),
      grounds,
      sports,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};