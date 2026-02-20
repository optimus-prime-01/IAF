import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const AVAILABLE_PERMISSIONS = [
    { key: 'manage_pdfs', label: '📄 Manage PDFs', description: 'Upload, edit, delete PDFs' },
    { key: 'manage_dictionary', label: '📘 Manage Dictionary', description: 'Add, edit, delete words' },
    { key: 'manage_abbreviations', label: '🔤 Manage Abbreviations', description: 'Add, edit, delete abbreviations' },
    { key: 'manage_admins', label: '👥 Manage Admins', description: 'Create, edit, delete sub-admins' },
    { key: 'view_audit', label: '📋 View Admin Audit', description: 'View admin activity logs' },
    { key: 'view_user_audit', label: '👁️ View User Audit', description: 'View user activity logs' },
];

export default function AdminManager() {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        password: '',
        permissions: []
    });

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/admin/sub-admins');
            setAdmins(res.data.data || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load admins');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (editingAdmin) {
                await api.put(`/api/admin/sub-admins/${editingAdmin._id}`, {
                    permissions: formData.permissions
                });
            } else {
                await api.post('/api/admin/sub-admins', formData);
            }
            setShowForm(false);
            setEditingAdmin(null);
            resetForm();
            fetchAdmins();
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (admin) => {
        setEditingAdmin(admin);
        setFormData({
            name: admin.name,
            contact: admin.contact,
            password: '',
            permissions: admin.permissions || []
        });
        setShowForm(true);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete admin "${name}"?`)) return;

        try {
            await api.delete(`/api/admin/sub-admins/${id}`);
            fetchAdmins();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete admin');
        }
    };

    const togglePermission = (perm) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const resetForm = () => {
        setFormData({ name: '', contact: '', password: '', permissions: [] });
        setEditingAdmin(null);
    };

    if (loading) {
        return <div style={styles.loading}>Loading admins...</div>;
    }

    return (
        <div style={styles.container}>
            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.header}>
                <h3 style={styles.title}>Sub-Admin Management</h3>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    style={styles.addBtn}
                >
                    + Add Sub-Admin
                </button>
            </div>

            {showForm && (
                <div style={styles.formOverlay}>
                    <div style={styles.formCard}>
                        <h3 style={styles.formTitle}>
                            {editingAdmin ? 'Edit Sub-Admin Permissions' : 'Create New Sub-Admin'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            {!editingAdmin && (
                                <>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Phone Number</label>
                                        <input
                                            type="text"
                                            value={formData.contact}
                                            onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                            style={styles.input}
                                            placeholder="+91XXXXXXXXXX"
                                            required
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Password</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            style={styles.input}
                                            minLength={8}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <div style={styles.field}>
                                <label style={styles.label}>Permissions</label>
                                <div style={styles.permGrid}>
                                    {AVAILABLE_PERMISSIONS.map(p => (
                                        <label key={p.key} style={styles.permItem}>
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.includes(p.key)}
                                                onChange={() => togglePermission(p.key)}
                                            />
                                            <span style={styles.permLabel}>{p.label}</span>
                                            <span style={styles.permDesc}>{p.description}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={styles.formActions}>
                                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={styles.cancelBtn}>
                                    Cancel
                                </button>
                                <button type="submit" style={styles.submitBtn}>
                                    {editingAdmin ? 'Update Permissions' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={styles.table}>
                <div style={styles.tableHeader}>
                    <span style={styles.colName}>Name</span>
                    <span style={styles.colContact}>Contact</span>
                    <span style={styles.colPerms}>Permissions</span>
                    <span style={styles.colActions}>Actions</span>
                </div>
                {admins.length === 0 ? (
                    <div style={styles.noData}>No sub-admins found</div>
                ) : (
                    admins.map(admin => (
                        <div key={admin._id || admin.id} style={styles.tableRow}>
                            <span style={styles.colName}>{admin.name}</span>
                            <span style={styles.colContact}>{admin.contact}</span>
                            <span style={styles.colPerms}>
                                <div style={styles.permBadges}>
                                    {(admin.permissions || []).map(p => (
                                        <span key={p} style={styles.badge}>
                                            {AVAILABLE_PERMISSIONS.find(ap => ap.key === p)?.label || p}
                                        </span>
                                    ))}
                                    {(!admin.permissions || admin.permissions.length === 0) && (
                                        <span style={styles.noPerm}>No permissions</span>
                                    )}
                                </div>
                            </span>
                            <span style={styles.colActions}>
                                <button onClick={() => handleEdit(admin)} style={styles.editBtn}>Edit</button>
                                <button onClick={() => handleDelete(admin._id || admin.id, admin.name)} style={styles.deleteBtn}>Delete</button>
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px' },
    loading: { textAlign: 'center', padding: 40, color: '#666' },
    error: { background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { margin: 0, fontSize: '1.2rem', color: '#1e293b' },
    addBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    formOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    formCard: { background: '#fff', padding: 32, borderRadius: 12, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' },
    formTitle: { margin: '0 0 24px', fontSize: '1.25rem', color: '#1e293b' },
    field: { marginBottom: 20 },
    label: { display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', boxSizing: 'border-box' },
    permGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
    permItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: '#f8fafc', borderRadius: 8, cursor: 'pointer' },
    permLabel: { fontWeight: 500, fontSize: '0.95rem' },
    permDesc: { color: '#6b7280', fontSize: '0.85rem', marginLeft: 'auto' },
    formActions: { display: 'flex', gap: 12, marginTop: 24 },
    cancelBtn: { flex: 1, padding: '12px', border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 500 },
    submitBtn: { flex: 1, padding: '12px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    table: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 120px', padding: '16px 20px', background: '#f8fafc', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' },
    tableRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 120px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' },
    colName: { fontWeight: 500 },
    colContact: { color: '#6b7280' },
    colPerms: {},
    colActions: { display: 'flex', gap: 8 },
    permBadges: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    badge: { background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500 },
    noPerm: { color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' },
    editBtn: { background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: '#475569', fontWeight: 500 },
    deleteBtn: { background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontWeight: 500 },
    noData: { padding: 40, textAlign: 'center', color: '#9ca3af' }
};
