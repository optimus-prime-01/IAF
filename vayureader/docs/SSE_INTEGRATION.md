# Server-Sent Events (SSE) Integration Guide

Real-time PDF metadata updates via Server-Sent Events and Redis Pub/Sub.

## Architecture

```
Admin → PDF Controller → Redis Pub/Sub → SSE Controller → Connected Clients
```

**Why this approach:**
- **Redis Pub/Sub**: Supports horizontal scaling - multiple server instances can share events
- **SSE over WebSockets**: Simpler, automatic reconnection, works over standard HTTP

---

## Endpoint

```
GET /api/events
Authorization: Bearer <token>
Accept: text/event-stream
```

**Authentication required**: Uses the same unified auth as other endpoints.

---

## Event Types

| Event | Trigger | Payload Fields |
|-------|---------|----------------|
| `connected` | Initial connection | `message` |
| `PDF_ADDED` | New PDF uploaded | `id`, `title`, `category`, `createdAt`, `timestamp` |
| `PDF_UPDATED` | PDF modified | `id`, `title`, `category`, `updatedAt`, `timestamp` |
| `PDF_DELETED` | PDF removed | `id`, `title`, `timestamp` |

**Example event:**
```
event: PDF_ADDED
data: {"id":"507f1f77bcf86cd799439011","title":"Flight Manual v2","category":"Operations","createdAt":"2026-01-07T16:00:00.000Z","timestamp":"2026-01-07T16:00:00.123Z"}

```

---

## Client Integration

### JavaScript (Browser/Node.js)

```javascript
const token = 'your-jwt-token';
const eventSource = new EventSource(`/api/events?token=${token}`);

// Connection established
eventSource.addEventListener('connected', (e) => {
    console.log('Connected to events stream');
});

// New PDF uploaded
eventSource.addEventListener('PDF_ADDED', (e) => {
    const pdf = JSON.parse(e.data);
    console.log('New PDF:', pdf.title);
    // Refresh your PDF list or add to local state
});

// PDF updated
eventSource.addEventListener('PDF_UPDATED', (e) => {
    const pdf = JSON.parse(e.data);
    console.log('PDF updated:', pdf.id);
});

// PDF deleted
eventSource.addEventListener('PDF_DELETED', (e) => {
    const pdf = JSON.parse(e.data);
    console.log('PDF deleted:', pdf.id);
    // Remove from local state
});

// Handle errors
eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    // EventSource auto-reconnects, but you may want to handle UI state
};
```

### React Hook

```javascript
import { useEffect, useCallback } from 'react';

export function usePdfEvents(token, onPdfChange) {
    useEffect(() => {
        const eventSource = new EventSource(`/api/events?token=${token}`);

        eventSource.addEventListener('PDF_ADDED', (e) => {
            onPdfChange?.({ type: 'added', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('PDF_UPDATED', (e) => {
            onPdfChange?.({ type: 'updated', data: JSON.parse(e.data) });
        });

        eventSource.addEventListener('PDF_DELETED', (e) => {
            onPdfChange?.({ type: 'deleted', data: JSON.parse(e.data) });
        });

        return () => eventSource.close();
    }, [token, onPdfChange]);
}

// Usage
function PdfList() {
    const handlePdfChange = useCallback((event) => {
        if (event.type === 'added') {
            // Add to list
        } else if (event.type === 'deleted') {
            // Remove from list
        }
    }, []);

    usePdfEvents(authToken, handlePdfChange);
}
```

### React Native / Expo

Use the `react-native-sse` package:

```javascript
import EventSource from 'react-native-sse';

const es = new EventSource(`${API_BASE}/api/events`, {
    headers: { Authorization: `Bearer ${token}` }
});

es.addEventListener('PDF_ADDED', (e) => {
    const pdf = JSON.parse(e.data);
    // Update state
});
```

---

## Heartbeat

The server sends a heartbeat comment every 30 seconds to keep the connection alive:

```
:heartbeat

```

Clients should ignore lines starting with `:`.

---

## Scaling Considerations

1. **Multiple server instances**: Redis Pub/Sub ensures all instances receive events
2. **Connection limits**: Each SSE connection uses a dedicated Redis subscriber
3. **Reconnection**: Browsers auto-reconnect; mobile clients may need manual handling
4. **Nginx configuration**: `proxy_buffering off` is critical for real-time delivery

---

## Testing

### curl

```bash
curl -N -H "Authorization: Bearer <token>" \
     -H "Accept: text/event-stream" \
     https://localhost/api/events
```

### Simple HTML test page

```html
<!DOCTYPE html>
<html>
<body>
<h1>SSE Test</h1>
<pre id="log"></pre>
<script>
const token = 'YOUR_TOKEN';
const es = new EventSource(`/api/events?token=${token}`);
const log = document.getElementById('log');

es.onmessage = (e) => log.textContent += e.data + '\n';
['connected', 'PDF_ADDED', 'PDF_UPDATED', 'PDF_DELETED'].forEach(evt => {
    es.addEventListener(evt, (e) => {
        log.textContent += `${evt}: ${e.data}\n`;
    });
});
</script>
</body>
</html>
```
