/**
 * VayuReader SMS Simulator
 * 
 * A simple mock server to "catch" SMS requests sent by the backend.
 * Run this to verify OTP delivery without a real SMS gateway.
 */

const express = require('express');
const app = express();
const port = process.env.PORT || 8000;

// Store received messages in memory
let messages = [];

// Endpoint to receive SMS requests (compatible with msg.com format)
app.get('/smsc/sends', (req, res) => {
    const { from, to, text } = req.query;

    if (!to || !text) {
        return res.status(400).send('Missing "to" or "text" parameters');
    }

    const newMessage = {
        id: Date.now(),
        from: from || 'Unknown',
        to,
        text,
        timestamp: new Date().toLocaleTimeString()
    };

    messages.unshift(newMessage); // Add to top
    console.log(`[SMS Received] To: ${to} | Text: ${text}`);

    // Return a dummy success response
    res.send('OK: Message accepted for delivery');
});

// UI to display messages
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>VayuReader SMS Simulator</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px; color: #333; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #1a73e8; border-bottom: 2px solid #e8eaed; padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
            .refresh-btn { background: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
            .message-card { border: 1px solid #e8eaed; border-radius: 8px; padding: 15px; margin-bottom: 15px; transition: transform 0.2s; }
            .message-card:hover { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .meta { font-size: 12px; color: #70757a; margin-bottom: 8px; display: flex; justify-content: space-between; }
            .phone { font-weight: bold; color: #1e8e3e; }
            .text { font-size: 18px; color: #202124; background: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #1a73e8; }
            .empty { text-align: center; color: #70757a; padding: 40px; }
            .otp-highlight { color: #d93025; font-weight: bold; font-family: monospace; font-size: 20px; }
        </style>
        <script>
            // Auto refresh every 3 seconds
            setInterval(() => window.location.reload(), 3000);
        </script>
    </head>
    <body>
        <div class="container">
            <h1>
                📨 SMS Simulator 
                <button class="refresh-btn" onclick="window.location.reload()">Refresh</button>
            </h1>
            <p>Mock Gateway listening at: <code>http://localhost:8080/smsc/sends</code></p>
            
            <div id="messages">
                ${messages.length === 0 ? '<div class="empty">No messages received yet. Try requesting an OTP!</div>' : ''}
                ${messages.map(m => {
        // Extract OTP if present for highlighting
        const otpMatch = m.text.match(/\d{6}/);
        const highlightedText = otpMatch
            ? m.text.replace(otpMatch[0], '<span class="otp-highlight">' + otpMatch[0] + '</span>')
            : m.text;

        return `
                    <div class="message-card">
                        <div class="meta">
                            <span>From: <strong>${m.from}</strong> | To: <span class="phone">${m.to}</span></span>
                            <span>${m.timestamp}</span>
                        </div>
                        <div class="text">${highlightedText}</div>
                    </div>
                    `;
    }).join('')}
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(port, () => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║        VayuReader SMS Simulator Active                 ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  Simulator UI:  http://localhost:${port}                  ║`);
    console.log(`║  Gateway URL:   http://localhost:${port}/smsc/sends       ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');
});
