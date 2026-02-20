# Server-Sent Events (SSE)

Real-time notification architecture for VayuReader Backend v2.

## Overview

The backend uses **Server-Sent Events (SSE)** to push real-time updates to connected clients. This eliminates the need for polling and ensures instant UI refreshes when content changes.

**Endpoint**: `GET /api/events`

---

## Architecture

1.  **Redis Pub/Sub**: Services publish events to Redis channels.
2.  **SSE Router/Controller**: Subscribes to Redis and forwards messages to open HTTP connections.
3.  **Nginx**: Proxies the long-lived connection without buffering.

### Why Redis Pub/Sub?
Using Redis allows the application to scale horizontally in the future. Multiple backend instances can broadcast events to all connected clients regardless of which instance holds the client connection.

---

## Event Types

| Event Name | Payload Description | Trigger |
|---|---|---|
| `connected` | Connection status message | Client connects |
| `PDF_ADDED` | `{ pdfId, title, category }` | Admin uploads PDF |
| `PDF_UPDATED` | `{ pdfId, title }` | Admin updates PDF |
| `PDF_DELETED` | `{ pdfId }` | Admin deletes PDF |

*Note: Future events for dictionary/abbreviations updates can be added easily.*

---

## Client Integration

### JavaScript Example

```javascript
const connectSSE = (token) => {
    const eventSource = new EventSource('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    eventSource.onopen = () => {
        console.log('SSE Connected');
    };

    eventSource.addEventListener('PDF_ADDED', (event) => {
        const data = JSON.parse(event.data);
        // Refresh PDF list or showing toast notification
        showToast(`New PDF: ${data.title}`);
    });

    eventSource.onerror = (err) => {
        console.error('SSE Error', err);
        eventSource.close();
        // Implement reconnection logic here (exponential backoff)
        setTimeout(() => connectSSE(token), 5000);
    };
};
```

### Connection Handling
-   **Authorization**: Client must send a valid JWT token (usually handled via cookie or header if the EventSource polyfill supports it).
-   **Reconnection**: Browsers automatically attempt to reconnect native `EventSource`. Custom logic might be needed for error handling.
-   **Heartbeat**: The server sends a heartbeat comment `(: keepalive)` every 30 seconds to prevent timeouts from load balancers or firewalls.

---

## Server Configuration

**Nginx**:
Explicitly disables buffering for this endpoint (see `NGINX.md`).

```nginx
location /api/events {
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 24h;
}
```

**Express**:
Headers for SSE:
```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

---

## Scalability Considerations

-   **Connection Limits**: Each SSE connection consumes an open socket. Nginx and Node.js limits must be tuned for high concurrency (e.g., 10k+ users).
-   **Memory**: Minimal memory per connection, but aggregate usage grows with count.
-   **Alternatives**: For millions of connections, consider a dedicated push service/gateway (e.g., Pusher, Firebase) or specific Websocket microservice.
