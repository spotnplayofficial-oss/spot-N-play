import User from "../models/User.js";
import Ground from "../models/Ground.js";

export const getStats = async (req, res)=>{
    try{
        const players = await User.countDocuments({ role: 'player'});
        const grounds = await Ground.countDocuments();

        res.json({
            players: players + 107,
            grounds,
            sports: 8,
        });
    }catch (err){
        res.status(500).json({message: err.message});
    }
}