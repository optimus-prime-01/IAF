#!/usr/bin/env node

/**
 * Log Cleanup Script
 * 
 * Deletes audit logs (UserAudit and AuditLog) older than a specified retention period.
 * 
 * Usage: node scripts/cleanupLogs.js --days <number_of_days> [--dry-run]
 * Example: node scripts/cleanupLogs.js --days 90
 */

require('dotenv').config();
const mongoose = require('mongoose');
const UserAudit = require('../src/models/UserAudit');
const AuditLog = require('../src/models/AuditLog');

const args = process.argv.slice(2);

// Parse arguments
const getArg = (flag) => {
    const index = args.indexOf(flag);
    return index !== -1 ? args[index + 1] : null;
};

const hasFlag = (flag) => args.includes(flag);

const days = parseInt(getArg('--days') || '90', 10);
const dryRun = hasFlag('--dry-run');

if (isNaN(days) || days < 1) {
    console.error('Error: Please specify a valid number of days (minimum 1).');
    console.log('Usage: node scripts/cleanupLogs.js --days <number> [--dry-run]');
    process.exit(1);
}

const cleanup = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        console.log(`\nCleanup Configuration:`);
        console.log(`- Retention Days: ${days}`);
        console.log(`- Cutoff Date: ${cutoffDate.toISOString()}`);
        console.log(`- Mode: ${dryRun ? 'DRY RUN (no deletions)' : 'LIVE (will delete)'}`);
        console.log('-'.repeat(40));

        // Count logs to be deleted
        const userAuditCount = await UserAudit.countDocuments({ timestamp: { $lt: cutoffDate } });
        const auditLogCount = await AuditLog.countDocuments({ timestamp: { $lt: cutoffDate } });

        console.log(`\nFound logs older than ${days} days:`);
        console.log(`- UserAudit: ${userAuditCount} records`);
        console.log(`- AuditLog: ${auditLogCount} records`);

        if (dryRun) {
            console.log('\n[DRY RUN] Skipping deletion.');
        } else {
            if (userAuditCount > 0) {
                console.log('\nDeleting old UserAudit logs...');
                const result = await UserAudit.deleteMany({ timestamp: { $lt: cutoffDate } });
                console.log(`✓ Deleted ${result.deletedCount} UserAudit records`);
            } else {
                console.log('\nNo old UserAudit logs to delete.');
            }

            if (auditLogCount > 0) {
                console.log('\nDeleting old AuditLog logs...');
                const result = await AuditLog.deleteMany({ timestamp: { $lt: cutoffDate } });
                console.log(`✓ Deleted ${result.deletedCount} AuditLog records`);
            } else {
                console.log('\nNo old AuditLog logs to delete.');
            }
        }

        console.log('\nCleanup completed successfully!');

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('Disconnected from MongoDB');
        }
        process.exit(0);
    }
};

// Confirm before running if not dry-run and high count (optional safety, implemented as delay here for simplicity)
if (!dryRun) {
    console.log('Starting cleanup in 3 seconds... (Ctrl+C to cancel)');
    setTimeout(cleanup, 3000);
} else {
    cleanup();
}
