/**
 * API Injection Guard Middleware
 * 
 * Comprehensive security middleware that detects and blocks:
 * - CSV/Formula Injection (=HYPERLINK, =SUM, +cmd, DDE macros)
 * - JSON/NoSQL Key Injection ($ne, $gt, dot-notation keys)
 * - XSS/Script Injection (<script>, <iframe>, javascript: URIs)
 * - Path Traversal attempts (../, null bytes)
 * 
 * Returns a clear 400 Warning to the client with the specific threat type.
 */

const response = require('../utils/response');

// ─── Threat Detection Patterns ───────────────────────────────────────────────

// CSV/Formula injection: blocks =HYPERLINK, =SUM, +cmd|..., @SUM, DDE macros
const CSV_FORMULA_REGEX = /^=|^[-+@].*[|(!]/;
const HYPERLINK_REGEX = /hyperlink/i;

// XSS: <script>, <iframe>, <object>, <embed>, <applet>, javascript: URIs, event handlers
const XSS_REGEX = /<(script|iframe|object|embed|applet)|javascript:/i;
const EVENT_HANDLER_REGEX = /<[^>]+\bon\w+\s*=/i;

// Path traversal: ../ or ..\ or null bytes
const PATH_TRAVERSAL_REGEX = /(\.\.[/\\])|(%2e%2e[/\\%])|(%00)|\x00/i;

// Prototype pollution keys
const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];

// ─── Deep Payload Inspector ──────────────────────────────────────────────────

const inspectPayload = (obj, depth = 0) => {
    // Prevent deeply nested payloads (DoS via recursion)
    if (depth > 20) {
        return 'Payload nesting depth exceeds safe limit (20 levels)';
    }

    if (typeof obj === 'string') {
        const trimmed = obj.trim();

        // CSV/Formula Injection
        if (CSV_FORMULA_REGEX.test(trimmed)) {
            if (HYPERLINK_REGEX.test(trimmed)) {
                return `CSV/Hyperlink Injection detected: "${obj.substring(0, 100)}"`;
            }
            return `CSV/Formula Injection detected: "${obj.substring(0, 100)}"`;
        }

        // XSS/Script Injection
        if (XSS_REGEX.test(obj)) {
            return `XSS/Script Injection detected in payload`;
        }

        // Event handler injection (<div onclick=...>)
        if (EVENT_HANDLER_REGEX.test(obj)) {
            return `XSS/Event Handler Injection detected in payload`;
        }

        // Path traversal in string values
        if (PATH_TRAVERSAL_REGEX.test(obj)) {
            return `Path Traversal attempt detected: "${obj.substring(0, 100)}"`;
        }

    } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const threat = inspectPayload(obj[i], depth + 1);
            if (threat) return threat;
        }

    } else if (obj !== null && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
            // JSON/NoSQL Key Injection ($ne, $gt, etc.)
            if (key.startsWith('$') || key.includes('.')) {
                return `JSON/NoSQL Key Injection detected: "${key}"`;
            }

            // Prototype pollution
            if (PROTOTYPE_POLLUTION_KEYS.includes(key)) {
                return `Prototype Pollution attempt detected: "${key}"`;
            }

            const threat = inspectPayload(value, depth + 1);
            if (threat) return threat;
        }
    }

    return null;
};

// ─── Middleware ───────────────────────────────────────────────────────────────

const apiInjectionGuard = (req, res, next) => {
    // Check payload-bearing requests (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        const threat = inspectPayload(req.body);
        if (threat) {
            console.warn(`[SECURITY WARN] ${threat} | IP: ${req.ip} | Route: ${req.originalUrl} | Method: ${req.method}`);
            return response.badRequest(res, `Security Warning: Request blocked. ${threat}`);
        }
    }

    // Check query parameters
    if (req.query && Object.keys(req.query).length > 0) {
        const threat = inspectPayload(req.query);
        if (threat) {
            console.warn(`[SECURITY WARN] Query: ${threat} | IP: ${req.ip} | Route: ${req.originalUrl}`);
            return response.badRequest(res, `Security Warning: Request blocked. ${threat}`);
        }
    }

    // Check URL params for path traversal
    if (req.params) {
        for (const [key, value] of Object.entries(req.params)) {
            if (typeof value === 'string' && PATH_TRAVERSAL_REGEX.test(value)) {
                console.warn(`[SECURITY WARN] Path Traversal in param "${key}": "${value}" | IP: ${req.ip}`);
                return response.badRequest(res, `Security Warning: Path traversal detected in URL parameter "${key}"`);
            }
        }
    }

    next();
};

module.exports = apiInjectionGuard;
