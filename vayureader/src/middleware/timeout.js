/**
 * Request Timeout Middleware
 * 
 * Prevents requests from hanging indefinitely.
 * 
 * @module middleware/timeout
 */

/**
 * Creates a timeout middleware with specified duration.
 * @param {number} ms - Timeout in milliseconds (default 30000)
 */
const requestTimeout = (ms = 30000) => (req, res, next) => {
    // Set server timeout
    req.setTimeout(ms, () => {
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: 'Request timeout',
                errorCode: 'REQUEST_TIMEOUT'
            });
        }
    });

    // Also set response timeout
    res.setTimeout(ms);

    next();
};

module.exports = { requestTimeout };
