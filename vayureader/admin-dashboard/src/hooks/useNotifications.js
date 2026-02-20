import { useState, useCallback } from 'react';

/**
 * Custom hook for managing toast notifications.
 * 
 * @returns {Object} { notifications, addNotification, removeNotification }
 */
export function useNotifications() {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        const notification = { id, message, type };

        setNotifications(prev => [...prev, notification]);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return {
        notifications,
        addNotification,
        removeNotification,
    };
}

/**
 * Toast notification component styles
 */
export const notificationStyles = {
    container: {
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
    },
    toast: {
        padding: '12px 16px',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        animation: 'slideIn 0.3s ease-out',
    },
    info: {
        background: '#eff6ff',
        color: '#2563eb',
        border: '1px solid #dbeafe',
    },
    success: {
        background: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
    },
    warning: {
        background: '#fffbeb',
        color: '#d97706',
        border: '1px solid #fde68a',
    },
    error: {
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        marginLeft: 'auto',
        padding: 4,
        opacity: 0.7,
    },
};

/**
 * Toast notification component
 */
export function NotificationToast({ notifications, onRemove }) {
    if (notifications.length === 0) return null;

    return (
        <div style={notificationStyles.container}>
            {notifications.map(n => (
                <div
                    key={n.id}
                    style={{
                        ...notificationStyles.toast,
                        ...notificationStyles[n.type] || notificationStyles.info
                    }}
                >
                    <span>{n.message}</span>
                    <button
                        style={notificationStyles.closeBtn}
                        onClick={() => onRemove(n.id)}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}

export default useNotifications;
