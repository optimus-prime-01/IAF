/**
 * Redis Pub/Sub Service
 * 
 * Manages real-time event distribution for PDF metadata updates.
 * Uses Redis Pub/Sub to support horizontal scaling across multiple server instances.
 * 
 * @module services/pubsub.service
 */

const { redisClient, createSubscriberClient } = require('../config/redis');

// Event channel for PDF-related events
const CHANNELS = {
    PDF_EVENTS: 'pdf:events'
};

// Event types
const PDF_EVENTS = {
    ADDED: 'PDF_ADDED',
    UPDATED: 'PDF_UPDATED',
    DELETED: 'PDF_DELETED'
};

/**
 * Publish a PDF event to all subscribers.
 * 
 * @param {string} eventType - One of PDF_EVENTS (ADDED, UPDATED, DELETED)
 * @param {Object} data - Event payload (id, title, category, etc.)
 */
const publishPdfEvent = async (eventType, data) => {
    try {
        const event = {
            event: eventType,
            data: {
                ...data,
                timestamp: new Date().toISOString()
            }
        };

        await redisClient.publish(CHANNELS.PDF_EVENTS, JSON.stringify(event));
        console.log(`📢 Published ${eventType} event for PDF: ${data.id}`);
    } catch (error) {
        console.error('❌ Failed to publish PDF event:', error.message);
        // Don't throw - event publishing should not break main operations
    }
};

/**
 * Subscribe to PDF events.
 * Creates a dedicated subscriber client (required by Redis Pub/Sub).
 * 
 * @param {Function} callback - Called with each event: callback(eventData)
 * @returns {Object} - { subscriber, unsubscribe } to manage the subscription
 */
const subscribeToPdfEvents = async (callback) => {
    const subscriber = await createSubscriberClient();

    await subscriber.subscribe(CHANNELS.PDF_EVENTS, (message) => {
        try {
            const event = JSON.parse(message);
            callback(event);
        } catch (error) {
            console.error('❌ Failed to parse PDF event:', error.message);
        }
    });

    console.log('✅ Subscribed to PDF events channel');

    return {
        subscriber,
        unsubscribe: async () => {
            await subscriber.unsubscribe(CHANNELS.PDF_EVENTS);
            await subscriber.quit();
            console.log('🔌 Unsubscribed from PDF events channel');
        }
    };
};

module.exports = {
    CHANNELS,
    PDF_EVENTS,
    publishPdfEvent,
    subscribeToPdfEvents
};
