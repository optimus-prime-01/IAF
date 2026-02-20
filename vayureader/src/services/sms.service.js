/**
 * SMS Service
 * 
 * Handles SMS sending via the configured SMS gateway (msg.com compatible).
 * 
 * @module services/sms.service
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { otp: otpConfig, server } = require('../config/environment');

/**
 * Builds the URL for the SMS gateway request.
 * 
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {URL} Constructed URL object
 */
const buildSmsUrl = (to, message) => {
    // Handle spaces in the gateway URL path
    const baseUrl = otpConfig.gatewayUrl.replace(/ /g, '%20');
    const url = new URL(baseUrl);

    url.searchParams.set('from', 'VAYUREADER');
    url.searchParams.set('to', to);
    url.searchParams.set('text', message);

    return url;
};

/**
 * Sends an SMS message via the configured gateway.
 * 
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<{success: boolean, devMode: boolean, error?: string}>}
 */
const sendSms = async (to, message) => {
    // Skip sending in dev mode
    if (otpConfig.skipSend) {
        console.log(`[DEV SMS] To: ${to}`);
        console.log(`[DEV SMS] Message: ${message}`);
        return { success: true, devMode: true };
    }

    return new Promise((resolve, reject) => {
        try {
            const url = buildSmsUrl(to, message);
            const client = url.protocol === 'https:' ? https : http;

            if (server.isDevelopment) {
                console.log(`[SMS] Sending to gateway: ${url.toString()}`);
            }

            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'GET',
                timeout: 10000
            };

            const req = client.request(options, (res) => {
                res.on('data', () => {
                    // Consume data to allow 'end' event to fire
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true, devMode: false });
                    } else {
                        reject(new Error(`SMS gateway error: ${res.statusCode} ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Failed to send SMS: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('SMS gateway request timeout'));
            });

            req.end();
        } catch (error) {
            reject(new Error(`Invalid SMS gateway URL: ${error.message}`));
        }
    });
};

/**
 * Sends an OTP SMS with the standard message format.
 * 
 * @param {string} to - Recipient phone number
 * @param {string} otp - OTP code
 * @returns {Promise<{success: boolean, devMode: boolean, otp?: string, error?: string}>}
 */
const sendOtpSms = async (to, otp) => {
    const message = `Your VayuReader OTP: ${otp}. Valid for ${otpConfig.expiryMinutes} minutes.`;

    try {
        const result = await sendSms(to, message);

        // In dev mode, include OTP in response for testing
        if (result.devMode) {
            return { ...result, otp };
        }

        return result;
    } catch (error) {
        return {
            success: false,
            devMode: false,
            error: error.message
        };
    }
};

module.exports = {
    sendSms,
    sendOtpSms
};
