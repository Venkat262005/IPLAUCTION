const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// ── Global safety net ────────────────────────────────────────────────────────
// Catch any uncaught exception or unhandled rejection that would otherwise
// kill the process (e.g. a MongoNetworkError emitted with no listener).
process.on('uncaughtException', (err) => {
    console.error('[PROCESS] Uncaught Exception — keeping server alive:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[PROCESS] Unhandled Promise Rejection — keeping server alive:', reason?.message || reason);
});
// ─────────────────────────────────────────────────────────────────────────────

// Load env vars
dotenv.config();

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();
        
        const PlayerCache = require('./utils/PlayerCache');
        await PlayerCache.load();

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, async () => {
            console.log(`[SUCCESS] Server running on port ${PORT}`);
            // Start batched DB write flush (writes dirty rooms every 30s instead of per-bid)
            startPeriodicFlush(30000);

            // [NEW] Stagnant Room Cleanup (Every 2 minutes)
            const { startAuctionCleanup } = require('./services/auctionCleanup');
            startAuctionCleanup(120000); 

            // [NEW] Startup Recovery: Resume ongoing auctions from DB
            try {
                const ActiveRoom = require('./models/ActiveRoom');
                const { rehydrateRoomState, resumeAuction } = require('./socket/auctionEngine');
                const ongoingRooms = await ActiveRoom.find({ auctionStatus: 'ONGOING' });
                
                if (ongoingRooms.length > 0) {
                    console.log(`[RECOVERY] Found ${ongoingRooms.length} ongoing room(s). Resuming...`);
                    for (const room of ongoingRooms) {
                        const state = await rehydrateRoomState(room.roomCode);
                        if (state) {
                            resumeAuction(room.roomCode, io);
                        }
                    }
                }
            } catch (err) {
                console.error('[RECOVERY] Startup recovery failed:', err.message);
            }
        });
    } catch (err) {
        console.error('💥 Failed to start server:', err.message);
        process.exit(1);
    }
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Body parser

const server = http.createServer(app);

const { setupSocketHandlers } = require('./socket/auctionEngine');
const { startPeriodicFlush } = require('./services/dbWriter');

const apiRoutes = require('./routes/api');
const sessionRoutes = require('./routes/session');

// Setup Socket.io
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    // Allow polling + websocket: polling is required for Vite dev proxy to perform
    // the HTTP upgrade handshake before switching to WebSocket. In production
    // (no proxy) socket.io negotiates WebSocket directly for zero overhead.
    transports: ['polling', 'websocket'],
    // Compress large payloads (new_player with stats, lobby updates)
    perMessageDeflate: {
        threshold: 1024 // Only compress messages > 1KB
    },
    // [STABILITY-UPGRADE] Increased buffer for large room states
    maxHttpBufferSize: 5e6, // 5MB limit
    // [STABILITY-UPGRADE] Robust connection monitoring for real-world networks
    pingInterval: 10000, 
    pingTimeout: 20000,    // Allow 20s for ping response (better for mobile/slow networks)
    connectTimeout: 30000, // Wait 30s for handshake
    upgradeTimeout: 20000, // Allow 20s for HTTP -> WS upgrade
    // Allow CORS for socket.io polling endpoint
    allowEIO3: true
});

// [STABILITY-UPGRADE] Catch and log low-level server-side socket errors
io.on('error', (err) => {
    console.error('[SOCKET-SERVER] Global IO Error:', err.message);
});

setupSocketHandlers(io);

app.use('/api', apiRoutes);
app.use('/api/session', sessionRoutes);

app.get('/', (req, res) => {
    res.send('IPL Auction Server API is running');
});

// Health check endpoint — used by UptimeRobot and self-ping to prevent Render cold starts
app.get('/health', (req, res) => {
    res.json({ status: 'ok', ts: Date.now(), uptime: process.uptime() });
});

// Self-ping every 14 minutes to keep Render free tier alive (avoids 15-min spin-down)
if (process.env.NODE_ENV === 'production' && process.env.SERVER_URL) {
    setInterval(() => {
        fetch(`${process.env.SERVER_URL}/health`)
            .then(() => console.log('[KEEP-ALIVE] Self-ping successful'))
            .catch(err => console.warn('[KEEP-ALIVE] Self-ping failed:', err.message));
    }, 14 * 60 * 1000); // Every 14 minutes
}

const PlayerCache = require('./utils/PlayerCache');

// Memory Monitoring (Lightweight)
setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`[SYS] RAM: ${Math.round(mem.rss / 1024 / 1024)}MB | Rooms: ${require('./core/RoomManager').getAllRooms().length}`);
}, 60000);

// Invoke startServer
startServer();

module.exports = { io };
