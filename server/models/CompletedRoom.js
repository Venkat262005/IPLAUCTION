const mongoose = require('mongoose');

const completedRoomSchema = new mongoose.Schema({
    roomCode: { type: String, required: true },
    
    summary: {
        totalPlayers: { type: Number, default: 0 },
        soldPlayers: { type: Number, default: 0 }
    },
    
    results: [{
        playerName: String,
        soldTo: String,
        amount: Number
    }],
    
    completedAt: { type: Date, default: Date.now },
    
    expiresAt: { type: Date, required: true } // TTL field
}, { timestamps: true });

// TTL index: automatically delete after 'expiresAt'
completedRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CompletedRoom', completedRoomSchema);
