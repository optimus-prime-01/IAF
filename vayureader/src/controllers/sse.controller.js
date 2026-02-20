/**
 * SSE Controller
 * 
 * Handles Server-Sent Events connections for real-time PDF metadata updates.
 * Clients connect once and receive push notifications when PDFs change.
 * 
 * @module controllers/sse.controller
 */

const { subscribeToPdfEvents } = require('../services/pubsub.service');

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000;

/**
 * SSE connection handler.
 * Establishes a long-lived connection and pushes events as they occur.
 */
const connectToEvents = async (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to PDF events stream' })}\n\n`);

    let subscription = null;
    let heartbeatTimer = null;

    try {
        // Subscribe to PDF events
        subscription = await subscribeToPdfEvents((event) => {
            // Format: event: <type>\ndata: <json>\n\n
            res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
        });

        // Send periodic heartbeats to keep connection alive
        heartbeatTimer = setInterval(() => {
            res.write(`:heartbeat\n\n`);
        }, HEARTBEAT_INTERVAL_MS);

        // Handle client disconnect
        req.on('close', async () => {
            console.log('🔌 SSE client disconnected');
            clearInterval(heartbeatTimer);
            if (subscription) {
                await subscription.unsubscribe();
            }
        });

    } catch (error) {
        console.error('❌ SSE connection error:', error.message);
        clearInterval(heartbeatTimer);
        if (subscription) {
            await subscription.unsubscribe();
        }
        res.end();
    }
};

module.exports = {
    connectToEvents
};
