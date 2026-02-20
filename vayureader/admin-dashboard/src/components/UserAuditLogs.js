import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export default function UserAuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const [filters, setFilters] = useState({
        action: '',
        phone_number: '',
        deviceId: '',
        startDate: '',
        endDate: ''
    });

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
            });
            if (filters.action) params.append('action', filters.action);
            if (filters.phone_number) params.append('phone_number', filters.phone_number);
            if (filters.deviceId) params.append('deviceId', filters.deviceId);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await api.get(`/api/user-audit/logs?${params}`);
            setLogs(res.data.data.logs || []);
            setPagination(prev => ({ ...prev, ...res.data.data.pagination }));
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load user audit logs');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Debounce text input changes
    const debounceRef = React.useRef(null);
    const handleFilterChange = (key, value) => {
        const textFields = ['phone_number', 'deviceId'];
        // Immediate update for dropdowns and dates
        if (!textFields.includes(key)) {
            setFilters(prev => ({ ...prev, [key]: value }));
            setPagination(prev => ({ ...prev, page: 1 }));
        } else {
            // Debounce text input
            setFilters(prev => ({ ...prev, [key]: value }));
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setPagination(prev => ({ ...prev, page: 1 }));
            }, 500);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getActionBadge = (action) => {
        const colors = {
            LOGIN: { bg: '#dcfce7', color: '#166534' },
            DEVICE_CHANGE: { bg: '#fef3c7', color: '#92400e' },
            NAME_CHANGE: { bg: '#dbeafe', color: '#1e40af' },
            READ_PDF: { bg: '#f1f5f9', color: '#475569' }
        };
        const style = colors[action] || { bg: '#f1f5f9', color: '#475569' };
        return <span style={{ ...styles.badge, background: style.bg, color: style.color }}>{action}</span>;
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>👁️ User Activity Logs</h3>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.filters}>
                <select
                    value={filters.action}
                    onChange={e => handleFilterChange('action', e.target.value)}
                    style={styles.select}
                >
                    <option value="">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="DEVICE_CHANGE">Device Change</option>
                    <option value="NAME_CHANGE">Name Change</option>
                    <option value="READ_PDF">Read PDF</option>
                </select>

                <input
                    type="text"
                    placeholder="Phone number..."
                    value={filters.phone_number}
                    onChange={e => handleFilterChange('phone_number', e.target.value)}
                    style={styles.input}
                />

                <input
                    type="text"
                    placeholder="Device ID..."
                    value={filters.deviceId}
                    onChange={e => handleFilterChange('deviceId', e.target.value)}
                    style={styles.input}
                />

                <input
                    type="date"
                    value={filters.startDate}
                    onChange={e => handleFilterChange('startDate', e.target.value)}
                    style={styles.dateInput}
                />
                <span style={styles.dateSep}>to</span>
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={e => handleFilterChange('endDate', e.target.value)}
                    style={styles.dateInput}
                />

                <button
                    onClick={() => setFilters({ action: '', phone_number: '', deviceId: '', startDate: '', endDate: '' })}
                    style={styles.clearBtn}
                >
                    Clear
                </button>
            </div>

            {loading ? (
                <div style={styles.loading}>Loading...</div>
            ) : (
                <>
                    <div style={styles.table}>
                        <div style={styles.tableHeader}>
                            <span>Time</span>
                            <span>Phone</span>
                            <span>Action</span>
                            <span>Device ID</span>
                            <span>Details</span>
                        </div>
                        {logs.length === 0 ? (
                            <div style={styles.noData}>No user activity logs found</div>
                        ) : (
                            logs.map(log => (
                                <div key={log._id} style={styles.tableRow}>
                                    <span style={styles.time}>{formatDate(log.timestamp)}</span>
                                    <span style={styles.phone}>{log.phone_number}</span>
                                    <span>{getActionBadge(log.action)}</span>
                                    <span style={styles.deviceId}>
                                        {log.deviceId ? log.deviceId.substring(0, 12) + '...' : '-'}
                                    </span>
                                    <span style={styles.details}>
                                        {log.action === 'DEVICE_CHANGE' && log.metadata && (
                                            <span>
                                                {log.metadata.previousDeviceId?.substring(0, 8)}... → {log.metadata.newDeviceId?.substring(0, 8)}...
                                            </span>
                                        )}
                                        {log.action === 'READ_PDF' && log.metadata?.title}
                                        {log.action === 'NAME_CHANGE' && log.metadata && (
                                            <span>{log.metadata.oldName} → {log.metadata.newName}</span>
                                        )}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {pagination.pages > 1 && (
                        <div style={styles.pagination}>
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                style={styles.pageBtn}
                            >
                                Previous
                            </button>
                            <span style={styles.pageInfo}>
                                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                            </span>
                            <button
                                disabled={pagination.page >= pagination.pages}
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                style={styles.pageBtn}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

const styles = {
    container: { padding: '20px' },
    title: { margin: '0 0 20px', fontSize: '1.2rem', color: '#1e293b' },
    error: { background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
    filters: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
    select: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', minWidth: 140 },
    input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, minWidth: 140 },
    dateInput: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 },
    dateSep: { color: '#6b7280', fontSize: '0.9rem' },
    clearBtn: { padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer' },
    loading: { textAlign: 'center', padding: 40, color: '#666' },
    table: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { display: 'grid', gridTemplateColumns: '150px 140px 130px 150px 1fr', padding: '14px 20px', background: '#f8fafc', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' },
    tableRow: { display: 'grid', gridTemplateColumns: '150px 140px 130px 150px 1fr', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: '0.9rem' },
    time: { color: '#6b7280', fontSize: '0.85rem' },
    phone: { fontWeight: 500, fontFamily: 'monospace' },
    badge: { padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 },
    deviceId: { color: '#6b7280', fontSize: '0.8rem', fontFamily: 'monospace' },
    details: { color: '#6b7280', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' },
    noData: { padding: 40, textAlign: 'center', color: '#9ca3af' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 20 },
    pageBtn: { padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer' },
    pageInfo: { color: '#6b7280', fontSize: '0.9rem' }
};
