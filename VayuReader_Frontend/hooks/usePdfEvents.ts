import { useEffect, useRef } from 'react';
import { PDF_BASE_URL } from '@/constants/config';
import EventSource from 'react-native-sse';
import { getToken } from '@/lib/authStorage';

// Define supported event types
export type PdfEventType = 'connected' | 'PDF_ADDED' | 'PDF_UPDATED' | 'PDF_DELETED';

export interface PdfEventPayload {
    message?: string;
    id?: string;
    _id?: string;
    title?: string;
    category?: string;
    pdfUrl?: string;
    thumbnail?: any;
    viewCount?: number;
    createdAt?: string;
    [key: string]: any;
}

export type PdfEvent = {
    type: PdfEventType;
    data: PdfEventPayload;
};

// Define custom events for our SSE connection
type CustomEvents = 'connected' | 'PDF_ADDED' | 'PDF_UPDATED' | 'PDF_DELETED' | 'open' | 'error' | 'close';

/**
 * Hook to subscribe to Server-Sent Events for PDF updates.
 * Uses react-native-sse for React Native compatibility.
 * Sends JWT token via Authorization header for authenticated access.
 * 
 * @param onEvent Callback function to handle incoming events
 * @param dependencies Optional dependency array to re-subscribe if changed
 */
export const usePdfEvents = (
    onEvent: (event: PdfEvent) => void,
    dependencies: any[] = []
) => {
    const eventSourceRef = useRef<EventSource<CustomEvents> | null>(null);

    useEffect(() => {
        let es: EventSource<CustomEvents> | null = null;
        let isMounted = true;

        const connect = async () => {
            // Ensure we have a valid URL
            if (!PDF_BASE_URL) {
                console.warn('[SSE] No PDF_BASE_URL configured');
                return;
            }

            // Get auth token for authenticated SSE connection
            const token = await getToken();
            if (!token) {
                console.warn('[SSE] No auth token available, skipping SSE connection');
                return;
            }

            const url = `${PDF_BASE_URL}/api/events`;
            console.log('[SSE] Connecting to:', url);

            try {
                // Create EventSource connection using react-native-sse
                // Send JWT via Authorization header for authentication
                es = new EventSource<CustomEvents>(url, {
                    headers: {
                        'Accept': 'text/event-stream',
                        'Authorization': `Bearer ${token}`,
                    },
                    // Explicitly set line ending character for proper SSE parsing
                    lineEndingCharacter: '\n',
                });
                eventSourceRef.current = es;

                es.addEventListener('open', () => {
                    if (isMounted) {
                        console.log('[SSE] Connection established');
                    }
                });

                // Handle 'connected' event
                es.addEventListener('connected', (event) => {
                    if (!isMounted) return;
                    console.log('[SSE] Received connected event');
                    try {
                        const data = event.data ? JSON.parse(event.data) : {};
                        onEvent({ type: 'connected', data });
                    } catch (e) {
                        console.error('[SSE] Failed to parse connected event', e);
                    }
                });

                // Handle PDF Added
                es.addEventListener('PDF_ADDED', (event) => {
                    if (!isMounted) return;
                    try {
                        const data = event.data ? JSON.parse(event.data) : {};
                        console.log('[SSE] PDF Added:', data.id);
                        onEvent({ type: 'PDF_ADDED', data });
                    } catch (e) {
                        console.error('[SSE] Failed to parse PDF_ADDED event', e);
                    }
                });

                // Handle PDF Updated
                es.addEventListener('PDF_UPDATED', (event) => {
                    if (!isMounted) return;
                    try {
                        const data = event.data ? JSON.parse(event.data) : {};
                        console.log('[SSE] PDF Updated:', data.id);
                        onEvent({ type: 'PDF_UPDATED', data });
                    } catch (e) {
                        console.error('[SSE] Failed to parse PDF_UPDATED event', e);
                    }
                });

                // Handle PDF Deleted
                es.addEventListener('PDF_DELETED', (event) => {
                    if (!isMounted) return;
                    try {
                        const data = event.data ? JSON.parse(event.data) : {};
                        console.log('[SSE] PDF Deleted:', data.id);
                        onEvent({ type: 'PDF_DELETED', data });
                    } catch (e) {
                        console.error('[SSE] Failed to parse PDF_DELETED event', e);
                    }
                });

                es.addEventListener('error', (error) => {
                    if (!isMounted) return;
                    const errorMsg = 'message' in error ? (error as any).message : 'Connection error';
                    console.log('[SSE] Connection error (will auto-retry):', errorMsg);
                });

            } catch (err) {
                console.error('[SSE] Failed to create EventSource:', err);
            }
        };

        connect();

        // Cleanup function
        return () => {
            isMounted = false;
            if (es) {
                console.log('[SSE] Closing connection');
                es.close();
                eventSourceRef.current = null;
            }
        };
    }, dependencies);
};
