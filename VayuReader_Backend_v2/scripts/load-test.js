#!/usr/bin/env node

/**
 * Lightweight API load test utility for concurrent request checks.
 *
 * Example:
 * node scripts/load-test.js \
 *   --url http://localhost:5000/health \
 *   --requests 200 \
 *   --concurrency 20
 */

const defaults = {
    method: 'GET',
    requests: 100,
    concurrency: 10,
    timeoutMs: 10000,
    readBody: false,
    insecure: false
};

function parseArgs(argv) {
    const args = {};

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const key = token.slice(2);
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) {
            args[key] = true;
            continue;
        }
        args[key] = value;
        i += 1;
    }

    return args;
}

function parseHeaders(rawHeaders) {
    if (!rawHeaders) return {};

    try {
        const parsed = JSON.parse(rawHeaders);
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
            throw new Error('Headers must be a JSON object');
        }
        return parsed;
    } catch (error) {
        throw new Error(`Invalid --headers JSON: ${error.message}`);
    }
}

function parseBody(rawBody) {
    if (!rawBody) return undefined;

    try {
        return JSON.parse(rawBody);
    } catch (error) {
        throw new Error(`Invalid --body JSON: ${error.message}`);
    }
}

function toInt(value, fieldName) {
    const num = Number.parseInt(value, 10);
    if (!Number.isFinite(num) || num <= 0) {
        throw new Error(`${fieldName} must be a positive integer`);
    }
    return num;
}

function toBool(value, fieldName) {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
    throw new Error(`${fieldName} must be a boolean (true/false)`);
}

async function requestWithTimeout(url, options, timeoutMs, readBody) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const start = process.hrtime.bigint();
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (readBody) {
            // Consume full response payload to measure actual read latency/throughput.
            await response.arrayBuffer();
        }
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        return {
            ok: response.ok,
            status: response.status,
            durationMs
        };
    } catch (error) {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const rootCause = error && error.cause && (error.cause.code || error.cause.message);
        return {
            ok: false,
            status: 0,
            error: error.name === 'AbortError' ? 'TIMEOUT' : (rootCause || error.message),
            durationMs
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function printSummary(config, results, startedAt, endedAt) {
    const totalDurationMs = endedAt - startedAt;
    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.length - successCount;
    const timeoutCount = results.filter((r) => r.error === 'TIMEOUT').length;

    const byStatus = new Map();
    const byError = new Map();
    results.forEach((r) => {
        const key = r.status || 'ERROR';
        byStatus.set(key, (byStatus.get(key) || 0) + 1);
        if (r.error) {
            byError.set(r.error, (byError.get(r.error) || 0) + 1);
        }
    });

    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const avgMs = durations.reduce((sum, d) => sum + d, 0) / Math.max(1, durations.length);
    const rps = (results.length / (totalDurationMs / 1000)).toFixed(2);

    console.log('\n=== Load Test Summary ===');
    console.log(`URL:           ${config.url}`);
    console.log(`Method:        ${config.method}`);
    console.log(`Read body:     ${config.readBody}`);
    console.log(`Insecure TLS:  ${config.insecure}`);
    console.log(`Requests:      ${results.length}`);
    console.log(`Concurrency:   ${config.concurrency}`);
    console.log(`Total time:    ${totalDurationMs.toFixed(2)} ms`);
    console.log(`Throughput:    ${rps} req/s`);
    console.log(`Success:       ${successCount}`);
    console.log(`Failed:        ${failCount}`);
    console.log(`Timeouts:      ${timeoutCount}`);
    console.log(`Latency avg:   ${avgMs.toFixed(2)} ms`);
    console.log(`Latency p50:   ${percentile(durations, 50).toFixed(2)} ms`);
    console.log(`Latency p95:   ${percentile(durations, 95).toFixed(2)} ms`);
    console.log(`Latency p99:   ${percentile(durations, 99).toFixed(2)} ms`);
    console.log('Status counts:');

    [...byStatus.entries()]
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
        .forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

    if (byError.size > 0) {
        console.log('Error counts:');
        [...byError.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([error, count]) => {
                console.log(`  ${error}: ${count}`);
            });
    }
}

async function run() {
    const args = parseArgs(process.argv.slice(2));
    const url = args.url || process.env.LOAD_TEST_URL;
    if (!url) {
        console.error('Missing URL. Use --url <endpoint> or set LOAD_TEST_URL.');
        process.exit(1);
    }

    const method = (args.method || defaults.method).toUpperCase();
    const requests = toInt(args.requests || defaults.requests, 'requests');
    const concurrency = toInt(args.concurrency || defaults.concurrency, 'concurrency');
    const timeoutMs = toInt(args.timeout || defaults.timeoutMs, 'timeout');
    const readBody = toBool(args['read-body'] ?? defaults.readBody, 'read-body');
    const insecure = toBool(args.insecure ?? defaults.insecure, 'insecure');
    const headers = parseHeaders(args.headers);
    const body = parseBody(args.body);

    if (insecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    if (body !== undefined && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }

    const results = [];
    let launched = 0;

    const startedAt = performance.now();

    async function worker() {
        while (launched < requests) {
            const current = launched;
            launched += 1;
            const result = await requestWithTimeout(url, options, timeoutMs, readBody);
            results[current] = result;
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, requests) }, () => worker());
    await Promise.all(workers);

    const endedAt = performance.now();
    printSummary({ url, method, concurrency, readBody, insecure }, results, startedAt, endedAt);
}

run().catch((error) => {
    console.error('Load test failed:', error.message);
    process.exit(1);
});
