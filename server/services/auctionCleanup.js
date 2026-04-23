const ActiveRoom = require('../models/ActiveRoom');

/**
 * auctionCleanup - Periodic job to identify stagnant auction rooms.
 * If a room is 'ONGOING' but hasn't had a bid in 10 minutes, move it to 'PAUSED'.
 * This prevents rooms from being stuck in an active state when the host disconnects.
 */
async function startAuctionCleanup(intervalMs = 60000) { // Default 1 minute
    console.log(`[CLEANUP] Initializing stagnant room cleanup job (Every ${intervalMs/1000}s)`);
    
    setInterval(async () => {
        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            
            // Find ONGOING rooms with no activity for 10 minutes
            const stagnantRooms = await ActiveRoom.find({
                auctionStatus: 'ONGOING',
                lastBidTime: { $lt: tenMinutesAgo }
            });

            if (stagnantRooms.length > 0) {
                console.log(`[CLEANUP] Found ${stagnantRooms.length} stagnant room(s). Marking as PAUSED.`);
                
                await ActiveRoom.updateMany(
                    { _id: { $in: stagnantRooms.map(r => r._id) } },
                    { $set: { auctionStatus: 'PAUSED' } }
                );

                for (const room of stagnantRooms) {
                    console.log(`[CLEANUP] Room ${room.roomCode} paused due to inactivity.`);
                }
            }
        } catch (err) {
            console.error('[CLEANUP] Error during stagnant room scan:', err.message);
        }
    }, intervalMs);
}

module.exports = { startAuctionCleanup };
