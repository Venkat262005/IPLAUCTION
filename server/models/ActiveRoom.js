const mongoose = require('mongoose');

const activeRoomSchema = new mongoose.Schema({
    roomCode: { type: String, required: true, unique: true },
    
    // Static room configuration (cached for performance)
    purseLimit: { type: Number, default: 12000 },
    isAiMode: { type: Boolean, default: false },
    teamCount: { type: Number, default: 10 },
    hostUserId: { type: String },   // [NEW] Permanent secure host identifier
    coHostUserIds: [{ type: String }], // [NEW] Up to 3 co-hosts
    
    // Dynamic auction state
    teams: [{
        franchiseId: String,
        teamName: String,
        teamThemeColor: String, // [NEW] Persist branding
        teamLogo: String,       // [NEW] Persist branding (matches frontend name)
        ownerUserId: String,
        ownerSocketId: String,
        currentPurse: Number,
        isBot: { type: Boolean, default: false },
        playersAcquired: { type: Array, default: [] },
        overseasCount: { type: Number, default: 0 }
    }],
    
    unsoldHistory: { type: Array, default: [] }, // [NEW] Persist scrolling unsold list
    
    currentPlayer: { type: mongoose.Schema.Types.Mixed, default: null },
    
    currentBid: {
        amount: Number,
        teamId: String,
        teamName: String,
        ownerUserId: String
    },
    
    auctionStatus: { 
        type: String, 
        enum: ["Lobby", "ONGOING", "PAUSED", "SOLD", "Selection", "Finished"], 
        default: "Lobby" 
    },
    
    timerDuration: { type: Number, default: 10 }, // seconds
    lastBidTime: { type: Date, default: Date.now }, // IMPORTANT for recovery
    
    last5Bids: [{
        amount: Number,
        teamName: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    isTimerRunning: { type: Boolean, default: false },
    
    currentIndex: { type: Number, default: 0 },
    
}, { timestamps: true });

module.exports = mongoose.model('ActiveRoom', activeRoomSchema);
