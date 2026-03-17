const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();
        
        const PlayerCache = require('./utils/PlayerCache');
        await PlayerCache.load();

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`[SUCCESS] Server running on port ${PORT}`);
            // Start batched DB write flush (writes dirty rooms every 30s instead of per-bid)
            startPeriodicFlush(30000);
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

const setupSocketHandlers = require('./socket/auctionEngine');
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
    // 100KB max message size (players are large objects)
    maxHttpBufferSize: 1e5,
    // Allow CORS for socket.io polling endpoint
    allowEIO3: true
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
