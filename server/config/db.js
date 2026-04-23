const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'ipl',
            maxPoolSize: 10,          // Maintain up to 10 socket connections for free tier Atlas
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 60000,
            heartbeatFrequencyMS: 10000, // Check server health every 10s
            retryWrites: true,
        });
        console.log(`✅ Cloud MongoDB Connected: ${conn.connection.host}`);

        // ── Connection-level error listeners ──────────────────────────────────
        // Without these, a network drop (ETIMEDOUT etc.) fires an uncaught
        // 'error' event on the Node EventEmitter and crashes the process.
        // Mongoose handles auto-reconnection internally; we just need to log.
        mongoose.connection.on('error', (err) => {
            console.error(`[DB] MongoDB connection error: ${err.message}`);
        });
        mongoose.connection.on('disconnected', () => {
            console.warn('[DB] MongoDB disconnected. Mongoose will attempt to reconnect...');
        });
        mongoose.connection.on('reconnected', () => {
            console.log('[DB] MongoDB reconnected successfully.');
        });
    } catch (err) {
        console.error(`💥 Cloud MongoDB Error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
