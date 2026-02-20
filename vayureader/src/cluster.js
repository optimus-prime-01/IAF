/**
 * Cluster Mode Startup Script
 * 
 * Starts the server in cluster mode to utilize all available CPU cores.
 * This dramatically improves performance for read-heavy workloads.
 * 
 * Usage: node src/cluster.js
 * 
 * In production, use PM2 instead: pm2 start src/server.js -i max
 */

const cluster = require('cluster');
const os = require('os');

// Get number of CPU cores (or use env variable to limit)
const numCPUs = parseInt(process.env.CLUSTER_WORKERS) || os.cpus().length;

if (cluster.isPrimary) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       VayuReader Backend - Cluster Mode                    ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Primary process PID: ${process.pid}                              ║`);
    console.log(`║  CPU cores available: ${os.cpus().length}                                 ║`);
    console.log(`║  Spawning ${numCPUs} worker(s)...                                   ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Handle worker death
    cluster.on('exit', (worker, code, signal) => {
        console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        cluster.fork();
    });

    // Log when workers are online
    cluster.on('online', (worker) => {
        console.log(`✅ Worker ${worker.process.pid} is online`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('🛑 SIGTERM received. Gracefully shutting down workers...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill('SIGTERM');
        }
    });

} else {
    // Workers run the actual server
    require('./server.js');
}
