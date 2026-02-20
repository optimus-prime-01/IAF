/**
 * Custom hooks for debounce functionality
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounce a value - returns the debounced value after delay.
 * 
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default 300ms)
 * @returns {*} The debounced value
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Debounce a callback function.
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default 300ms)
 * @returns {Function} The debounced function
 */
export function useDebouncedCallback(callback, delay = 300) {
    const timeoutRef = useRef(null);

    const debouncedCallback = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedCallback;
}
