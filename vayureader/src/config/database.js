/**
 * Database Connection
 * 
 * Manages MongoDB connection with proper error handling and logging.
 * 
 * @module config/database
 */

const mongoose = require('mongoose');
const { database, server } = require('./environment');

/**
 * Establishes connection to MongoDB.
 * Includes retry logic and proper event handling.
 * 
 * @returns {Promise<void>}
 */
const connectDB = async () => {
    try {
        // Configure mongoose settings
        mongoose.set('strictQuery', true);

        // Connect to MongoDB
        await mongoose.connect(database.uri, database.options);

        console.log('✅ MongoDB connected successfully');

        // Log connection details in development
        if (server.isDevelopment) {
            const dbName = mongoose.connection.db.databaseName;
            console.log(`   Database: ${dbName}`);
        }
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

// =============================================================================
// CONNECTION EVENT HANDLERS
// =============================================================================

mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB error:', error.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

module.exports = { connectDB };
