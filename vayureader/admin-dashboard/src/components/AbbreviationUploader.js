
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useDebouncedCallback } from '../utils/useDebounce';
import {
  validateFile,
  validateAbbreviationData,
  parseAbbreviationCSV,
  sanitizeString
} from '../utils/validateUpload';
import Pagination from './Pagination';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

// SVG icons
const EditIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" /></svg>
);
const DeleteIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
const CancelIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

export default function AbbreviationUploader() {
  const [abbreviation, setAbbreviation] = useState('');
  const [fullForm, setFullForm] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [abbreviations, setAbbreviations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editAbbreviation, setEditAbbreviation] = useState('');
  const [editFullForm, setEditFullForm] = useState('');
  const [loading, setLoading] = useState(false); // For actions (Add, Delete, Upload)
  const [isFetching, setIsFetching] = useState(false); // For table data fetching
  const [addLoading, setAddLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAbbreviations, setTotalAbbreviations] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const searchInputRef = useRef(null); // Uncontrolled input ref
  const [activeSearch, setActiveSearch] = useState(''); // Track active search term

  // Staged upload state
  const [stagedData, setStagedData] = useState(null);
  const [stagedFileName, setStagedFileName] = useState('');

  const csvInputRef = useRef();
  const jsonInputRef = useRef();

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  // Server-side pagination - fetch only the current page
  const fetchAbbreviations = useCallback(async (page = 1, limit = DEFAULT_PAGE_SIZE) => {
    try {
      setIsFetching(true);
      const response = await api.get(`/api/abbreviations/all?page=${page}&limit=${limit}`, { timeout: 10000 });
      const data = response.data.data;
      // Handle paginated response
      if (data && data.abbreviations) {
        setAbbreviations(data.abbreviations);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalAbbreviations(data.pagination?.total || data.abbreviations.length);
        setCurrentPage(data.pagination?.page || page);
      } else {
        // Fallback for old response format
        setAbbreviations(Array.isArray(data) ? data : []);
      }
      showMessage('', 'info');
    } catch (error) {
      showMessage('Failed to load abbreviations.', 'error');
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Search abbreviations via API
  const searchAbbreviationsAPI = useCallback(async (term) => {
    try {
      setIsFetching(true);
      const res = await api.get(`/api/abbreviations?search=${encodeURIComponent(term)}`);
      const data = res.data.data;
      setAbbreviations(Array.isArray(data) ? data : (data.abbreviations || []));
      setTotalAbbreviations(Array.isArray(data) ? data.length : (data.abbreviations?.length || 0));
      setTotalPages(1); // Search results are not paginated
    } catch {
      setAbbreviations([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Debounced handler for input changes
  const handleSearchChange = useDebouncedCallback((value) => {
    setActiveSearch(value);
    setCurrentPage(1); // Reset to page 1 on search

    if (value.trim()) {
      searchAbbreviationsAPI(value);
    } else {
      fetchAbbreviations(1, pageSize); // Reload all if clear
    }
  }, 300);

  // Initial load and page size change
  useEffect(() => {
    fetchAbbreviations(1, pageSize);
  }, [pageSize, fetchAbbreviations]);

  const handleSubmit = async () => {
    const cleanAbbr = sanitizeString(abbreviation.trim());
    const cleanForm = sanitizeString(fullForm.trim());

    if (!cleanAbbr || !cleanForm) {
      showMessage('Both fields are required', 'error');
      return;
    }
    try {
      setAddLoading(true);
      await api.post('/api/abbreviations', { abbreviation: cleanAbbr, fullForm: cleanForm }, { timeout: 10000 });
      showMessage('Abbreviation added successfully', 'success');
      setAbbreviation('');
      setFullForm('');
      await fetchAbbreviations(1, pageSize);
    } catch (error) {
      showMessage('Failed to add abbreviation.', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  // Stage CSV file for preview
  const handleCSVSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileCheck = validateFile(file, ['csv']);
    if (!fileCheck.valid) {
      showMessage(fileCheck.errors.join(', '), 'error');
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const result = parseAbbreviationCSV(text);

      if (!result.valid) {
        showMessage(result.errors.join(', '), 'error');
        e.target.value = '';
        return;
      }

      setStagedData(result.data);
      setStagedFileName(file.name);
      showMessage(`Ready to upload ${result.data.length} abbreviations from ${file.name}`, 'info');
    } catch (err) {
      showMessage('Failed to parse CSV: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  // Stage JSON file for preview
  const handleJSONSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileCheck = validateFile(file, ['json']);
    if (!fileCheck.valid) {
      showMessage(fileCheck.errors.join(', '), 'error');
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        showMessage('Invalid JSON format', 'error');
        e.target.value = '';
        return;
      }

      const result = validateAbbreviationData(parsed);
      if (!result.valid) {
        showMessage(result.errors.join(', '), 'error');
        e.target.value = '';
        return;
      }

      setStagedData(result.data);
      setStagedFileName(file.name);
      showMessage(`Ready to upload ${result.data.length} abbreviations from ${file.name}`, 'info');
    } catch (err) {
      showMessage('Failed to parse JSON: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  // Confirm and execute upload
  const handleConfirmUpload = async () => {
    if (!stagedData || stagedData.length === 0) {
      showMessage('No data staged for upload', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/abbreviations/bulk', stagedData, { timeout: 30000 });
      showMessage(`Successfully uploaded ${stagedData.length} abbreviations`, 'success');
      setStagedData(null);
      setStagedFileName('');
      await fetchAbbreviations(1, pageSize);
    } catch (err) {
      showMessage('Upload failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel staged upload
  const handleCancelUpload = () => {
    setStagedData(null);
    setStagedFileName('');
    showMessage('Upload cancelled', 'info');
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/abbreviations/export/all');
      const data = res.data.data;

      const headers = ['abbreviation', 'fullForm'];
      const csvRows = [headers.join(',')];

      data.forEach(item => {
        const row = [
          `"${(item.abbreviation || '').replace(/"/g, '""')}"`,
          `"${(item.fullForm || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abbreviations-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('CSV exported successfully', 'success');
    } catch (error) {
      showMessage('Export failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this abbreviation?')) return;
    try {
      setLoading(true);
      await api.delete(`/api/abbreviations/${id}`);
      showMessage('Abbreviation deleted', 'success');
      await fetchAbbreviations(currentPage, pageSize);
    } catch (error) {
      showMessage('Delete failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (abbr) => {
    setEditingId(abbr._id);
    setEditAbbreviation(abbr.abbreviation);
    setEditFullForm(abbr.fullForm);
  };

  const handleUpdate = async () => {
    const cleanAbbr = sanitizeString(editAbbreviation.trim());
    const cleanForm = sanitizeString(editFullForm.trim());

    if (!cleanAbbr || !cleanForm) {
      showMessage('Both fields are required', 'error');
      return;
    }
    try {
      setLoading(true);
      await api.put(`/api/abbreviations/${editingId}`, { abbreviation: cleanAbbr, fullForm: cleanForm });
      showMessage('Abbreviation updated', 'success');
      setEditingId(null);
      await fetchAbbreviations(currentPage, pageSize);
    } catch (error) {
      showMessage('Update failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // For search, we show all results; for normal view, server already paginated
  const paginatedAbbreviations = abbreviations;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>🔤 Abbreviation Manager</h2>
        <p style={styles.subheading}>Manage acronyms and their full forms</p>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          background: messageType === 'error' ? '#fef2f2' : messageType === 'success' ? '#f0fdf4' : '#eff6ff',
          color: messageType === 'error' ? '#dc2626' : messageType === 'success' ? '#16a34a' : '#2563eb',
          border: `1px solid ${messageType === 'error' ? '#fecaca' : messageType === 'success' ? '#bbf7d0' : '#dbeafe'}`
        }}>
          {message}
        </div>
      )}

      {/* Add Single Entry */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Add Single Entry</h3>
        <div style={styles.row}>
          <input
            placeholder="Abbreviation (e.g., AI)"
            value={abbreviation}
            onChange={e => setAbbreviation(e.target.value)}
            style={styles.input}
            disabled={loading || addLoading}
          />
          <input
            placeholder="Full Form (e.g., Artificial Intelligence)"
            value={fullForm}
            onChange={e => setFullForm(e.target.value)}
            style={{ ...styles.input, flex: 2 }}
            disabled={loading || addLoading}
          />
          <button style={styles.primaryBtn} onClick={handleSubmit} disabled={loading || addLoading}>
            {addLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Bulk Upload */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Bulk Upload</h3>

        {stagedData ? (
          <div style={styles.stagedBox}>
            <div style={styles.stagedInfo}>
              <strong>📁 {stagedFileName}</strong>
              <span style={styles.stagedCount}>{stagedData.length} entries ready</span>
            </div>
            <div style={styles.stagedPreview}>
              {stagedData.slice(0, 3).map((item, i) => (
                <div key={i} style={styles.previewItem}>{item.abbreviation} → {item.fullForm}</div>
              ))}
              {stagedData.length > 3 && <div style={styles.previewMore}>...and {stagedData.length - 3} more</div>}
            </div>
            <div style={styles.stagedActions}>
              <button style={styles.successBtn} onClick={handleConfirmUpload} disabled={loading}>
                {loading ? 'Uploading...' : 'Confirm Upload'}
              </button>
              <button style={styles.cancelBtn} onClick={handleCancelUpload} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.uploadGrid}>
            <div style={styles.uploadBox}>
              <p style={styles.label}>CSV File</p>
              <input type="file" accept=".csv" ref={csvInputRef} onChange={handleCSVSelect} disabled={loading} style={styles.fileInput} />
              <small style={styles.hint}>Format: abbreviation,fullForm</small>
            </div>
            <div style={styles.uploadBox}>
              <p style={styles.label}>JSON File</p>
              <input type="file" accept=".json" ref={jsonInputRef} onChange={handleJSONSelect} disabled={loading} style={styles.fileInput} />
              <small style={styles.hint}>[{`{"abbreviation":"AI","fullForm":"..."}`}]</small>
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Export</h3>
        <button style={styles.successBtn} onClick={handleExportCSV} disabled={loading}>
          {loading ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>

      {/* Database */}
      <div style={styles.card}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>Database ({totalAbbreviations})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <input
              placeholder="Start typing to search..."
              ref={searchInputRef}
              onChange={e => handleSearchChange(e.target.value)}
              style={{ ...styles.searchInput, width: '100%' }}
            />
          </div>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Abbreviation</th>
              <th style={styles.th}>Full Form</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && abbreviations.length === 0 ? (
              <tr><td colSpan={3} style={styles.emptyCell}>Loading...</td></tr>
            ) : paginatedAbbreviations.length === 0 ? (
              <tr><td colSpan={3} style={styles.emptyCell}>No abbreviations found</td></tr>
            ) : paginatedAbbreviations.map((abbr, idx) => (
              <tr key={abbr._id} style={idx % 2 === 0 ? styles.zebra : {}}>
                <td style={styles.td}>
                  {editingId === abbr._id ? (
                    <input value={editAbbreviation} onChange={e => setEditAbbreviation(e.target.value)} style={styles.input} />
                  ) : abbr.abbreviation}
                </td>
                <td style={styles.td}>
                  {editingId === abbr._id ? (
                    <input value={editFullForm} onChange={e => setEditFullForm(e.target.value)} style={styles.input} />
                  ) : abbr.fullForm}
                </td>
                <td style={styles.td}>
                  <div style={styles.actionGroup}>
                    {editingId === abbr._id ? (
                      <>
                        <button style={styles.saveBtn} onClick={handleUpdate}><SaveIcon /> Save</button>
                        <button style={styles.cancelBtn} onClick={() => setEditingId(null)}><CancelIcon /> Cancel</button>
                      </>
                    ) : (
                      <>
                        <button style={styles.editBtn} onClick={() => handleEdit(abbr)}><EditIcon /> Edit</button>
                        <button style={styles.deleteBtn} onClick={() => handleDelete(abbr._id)}><DeleteIcon /> Delete</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalAbbreviations}
          pageSize={pageSize}
          onPageChange={(page) => {
            if (!activeSearch.trim()) {
              fetchAbbreviations(page, pageSize);
            } else {
              setCurrentPage(page);
            }
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          loading={isFetching}
        />
      </div>
    </div>
  );
}

const styles = {
  container: { background: '#f8fafc', borderRadius: 16, padding: 24, maxWidth: 900, margin: '0 auto' },
  header: { marginBottom: 20 },
  heading: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 },
  subheading: { color: '#64748b', marginTop: 4, fontSize: '0.9rem' },
  message: { padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 500 },
  card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #e2e8f0' },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '0 0 12px 0' },
  row: { display: 'flex', gap: 12, alignItems: 'center' },
  input: { flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' },
  primaryBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' },
  successBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' },
  uploadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  uploadBox: { padding: 16, border: '2px dashed #cbd5e1', borderRadius: 8, textAlign: 'center' },
  label: { fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem' },
  hint: { color: '#94a3b8', fontSize: '0.75rem' },
  fileInput: { marginBottom: 8 },
  stagedBox: { background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 8, padding: 16 },
  stagedInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stagedCount: { background: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem' },
  stagedPreview: { background: '#fff', borderRadius: 6, padding: 12, marginBottom: 12, fontSize: '0.85rem', color: '#475569' },
  previewItem: { padding: '4px 0' },
  previewMore: { color: '#94a3b8', fontStyle: 'italic' },
  stagedActions: { display: 'flex', gap: 12 },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  searchInput: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 20, width: 200 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: '#f1f5f9', padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' },
  td: { padding: '12px', borderBottom: '1px solid #f1f5f9' },
  zebra: { background: '#fafbfd' },
  emptyCell: { textAlign: 'center', color: '#94a3b8', padding: 24 },
  actionGroup: { display: 'flex', gap: 8 },
  editBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  deleteBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  saveBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  cancelBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 },
  pageBtn: { background: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  loadingText: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    fontSize: '0.85rem',
    fontStyle: 'italic',
    pointerEvents: 'none'
  },
};