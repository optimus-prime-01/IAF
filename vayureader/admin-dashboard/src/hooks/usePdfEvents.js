import { useEffect, useRef, useCallback, useState } from 'react';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Custom hook for subscribing to PDF SSE events.
 * Provides real-time updates when PDFs are added, updated, or deleted.
 * 
 * @param {Object} options
 * @param {Function} options.onPdfAdded - Callback when a PDF is added
 * @param {Function} options.onPdfUpdated - Callback when a PDF is updated  
 * @param {Function} options.onPdfDeleted - Callback when a PDF is deleted
 * @param {boolean} options.enabled - Whether to enable the SSE connection (default: true)
 * @returns {Object} { isConnected, connectionError, reconnectAttempts }
 */
export function usePdfEvents({ onPdfAdded, onPdfUpdated, onPdfDeleted, enabled = true } = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Get the API base URL
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

    const connect = useCallback(() => {
        // Clean up existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            // Create SSE connection - browser will send cookies automatically
            // Note: EventSource doesn't support withCredentials in all browsers,
            // so we use fetch with ReadableStream for cross-origin with credentials
            const sseUrl = `${baseUrl}/api/events`;

            // Use native EventSource for same-origin, or polyfill pattern for CORS
            const eventSource = new EventSource(sseUrl, { withCredentials: true });
            eventSourceRef.current = eventSource;

            eventSource.addEventListener('connected', () => {
                console.log('🔌 SSE: Connected to PDF events stream');
                setIsConnected(true);
                setConnectionError(null);
                setReconnectAttempts(0);
            });

            eventSource.addEventListener('PDF_ADDED', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    console.log('📄 SSE: PDF added', data);
                    onPdfAdded?.(data);
                } catch (err) {
                    console.error('SSE: Failed to parse PDF_ADDED event', err);
                }
            });

            eventSource.addEventListener('PDF_UPDATED', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    console.log('✏️ SSE: PDF updated', data);
                    onPdfUpdated?.(data);
                } catch (err) {
                    console.error('SSE: Failed to parse PDF_UPDATED event', err);
                }
            });

            eventSource.addEventListener('PDF_DELETED', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    console.log('🗑️ SSE: PDF deleted', data);
                    onPdfDeleted?.(data);
                } catch (err) {
                    console.error('SSE: Failed to parse PDF_DELETED event', err);
                }
            });

            eventSource.onerror = (error) => {
                console.error('❌ SSE: Connection error', error);
                setIsConnected(false);
                setConnectionError('Connection lost');

                eventSource.close();
                eventSourceRef.current = null;

                // Attempt reconnection with exponential backoff
                setReconnectAttempts(prev => {
                    const attempts = prev + 1;
                    if (attempts <= MAX_RECONNECT_ATTEMPTS) {
                        const delay = RECONNECT_DELAY_MS * Math.pow(2, attempts - 1);
                        console.log(`🔄 SSE: Reconnecting in ${delay}ms (attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS})`);
                        reconnectTimeoutRef.current = setTimeout(connect, delay);
                    } else {
                        setConnectionError('Max reconnection attempts reached');
                    }
                    return attempts;
                });
            };

        } catch (err) {
            console.error('❌ SSE: Failed to create connection', err);
            setConnectionError(err.message);
        }
    }, [baseUrl, onPdfAdded, onPdfUpdated, onPdfDeleted]);

    useEffect(() => {
        if (enabled) {
            connect();
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [enabled, connect]);

    return {
        isConnected,
        connectionError,
        reconnectAttempts,
    };
}

export default usePdfEvents;
