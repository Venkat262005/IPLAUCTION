const express = require('express');
const router = express.Router();
const AuctionRoom = require('../models/AuctionRoom');
const { evaluateAllTeams } = require('../services/aiRating');

router.get('/room/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await AuctionRoom.findOne({ roomId: roomCode });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/room/:roomCode/results', async (req, res) => {
    try {
        const { roomCode } = req.params;
        const room = await AuctionRoom.findOne({ roomId: roomCode })
            .populate('franchisesInRoom.franchiseId')
            .populate('franchisesInRoom.playersAcquired.player');

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (room.status !== 'Finished') {
            return res.status(400).json({ error: 'Auction is not finished yet' });
        }

        // Sort teams by overallScore descending and assign rank (1 = best)
        const sorted = [...room.franchisesInRoom].sort((a, b) => {
            const scoreA = a.evaluation?.overallScore ?? 0;
            const scoreB = b.evaluation?.overallScore ?? 0;
            return scoreB - scoreA;
        });
        sorted.forEach((team, i) => { team.rank = i + 1; });

        res.json({ teams: sorted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error generating results' });
    }
});

router.get('/players', async (req, res) => {
    try {
        const { fetchAllPlayers } = require('../services/playerService');
        const players = await fetchAllPlayers();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
