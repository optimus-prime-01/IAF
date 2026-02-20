import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export default function AdminAuditLogs({ onNavigate }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const [filters, setFilters] = useState({
        action: '',
        resourceType: '',
        adminName: '',
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
            if (filters.resourceType) params.append('resourceType', filters.resourceType);
            if (filters.adminName) params.append('adminName', filters.adminName);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await api.get(`/api/audit/logs?${params}`);
            setLogs(res.data.data.logs || []);
            setPagination(prev => ({ ...prev, ...res.data.data.pagination }));
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load audit logs');
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
        // Immediate update for dropdowns and dates
        if (key !== 'adminName') {
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
            CREATE: { bg: '#dcfce7', color: '#166534' },
            UPDATE: { bg: '#fef3c7', color: '#92400e' },
            DELETE: { bg: '#fee2e2', color: '#dc2626' },
            READ: { bg: '#dbeafe', color: '#1e40af' }
        };
        const style = colors[action] || { bg: '#f1f5f9', color: '#475569' };
        return <span style={{ ...styles.badge, background: style.bg, color: style.color }}>{action}</span>;
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>📋 Admin Audit Logs</h3>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.filters}>
                <select
                    value={filters.action}
                    onChange={e => handleFilterChange('action', e.target.value)}
                    style={styles.select}
                >
                    <option value="">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                    <option value="READ">Read / View</option>
                </select>

                <select
                    value={filters.resourceType}
                    onChange={e => handleFilterChange('resourceType', e.target.value)}
                    style={styles.select}
                >
                    <option value="">All Resources</option>
                    <option value="PDF">PDF</option>
                    <option value="DICTIONARY_WORD">Dictionary</option>
                    <option value="ABBREVIATION">Abbreviation</option>
                    <option value="ADMIN">Admin</option>
                </select>

                <input
                    type="text"
                    placeholder="Admin name..."
                    value={filters.adminName}
                    onChange={e => handleFilterChange('adminName', e.target.value)}
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
                    onClick={() => setFilters({ action: '', resourceType: '', adminName: '', startDate: '', endDate: '' })}
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
                            <span>Admin</span>
                            <span>Action</span>
                            <span>Resource</span>
                            <span>Details</span>
                        </div>
                        {logs.length === 0 ? (
                            <div style={styles.noData}>No audit logs found</div>
                        ) : (
                            logs.map(log => (
                                <div key={log._id} style={styles.tableRow}>
                                    <span style={styles.time}>{formatDate(log.timestamp)}</span>
                                    <span style={styles.admin}>{log.adminName}</span>
                                    <span>{getActionBadge(log.action)}</span>
                                    <span style={styles.resource}>
                                        <span style={styles.resourceBadge}>{log.resourceType}</span>
                                    </span>
                                    <span style={styles.details}>
                                        {log.resourceType === 'PDF' && log.action !== 'DELETE' ? (
                                            <span
                                                style={{ ...styles.link, cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                                                onClick={() => onNavigate && onNavigate('pdf', log.resourceId)}
                                                title="Click to view PDF"
                                            >
                                                {log.details?.title || log.details?.name || log.resourceId?.substring(0, 8)}
                                            </span>
                                        ) : (
                                            log.details?.title || log.details?.name || log.details?.word || log.resourceId?.substring(0, 8)
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
    select: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', minWidth: 130 },
    input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, minWidth: 150 },
    dateInput: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 },
    dateSep: { color: '#6b7280', fontSize: '0.9rem' },
    clearBtn: { padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer' },
    loading: { textAlign: 'center', padding: 40, color: '#666' },
    table: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { display: 'grid', gridTemplateColumns: '150px 1fr 100px 130px 1fr', padding: '14px 20px', background: '#f8fafc', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' },
    tableRow: { display: 'grid', gridTemplateColumns: '150px 1fr 100px 130px 1fr', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: '0.9rem' },
    time: { color: '#6b7280', fontSize: '0.85rem' },
    admin: { fontWeight: 500 },
    badge: { padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 },
    resource: {},
    resourceBadge: { background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem' },
    details: { color: '#6b7280', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' },
    noData: { padding: 40, textAlign: 'center', color: '#9ca3af' },
    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 20 },
    pageBtn: { padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer' },
    pageInfo: { color: '#6b7280', fontSize: '0.9rem' }
};
