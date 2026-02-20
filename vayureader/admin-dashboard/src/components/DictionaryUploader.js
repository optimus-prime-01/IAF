
import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useDebouncedCallback } from '../utils/useDebounce';
import {
  validateFile,
  validateDictionaryData,
  parseDictionaryCSV,
  sanitizeString
} from '../utils/validateUpload';
import Pagination from './Pagination';

const DEFAULT_PAGE_SIZE = 50; // Matches backend default
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

export default function DictionaryUploader() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false); // For actions
  const [isFetching, setIsFetching] = useState(false); // For data fetching

  // Single entry form
  const [newWord, setNewWord] = useState('');
  const [newPartOfSpeech, setNewPartOfSpeech] = useState('noun');
  const [newDefinition, setNewDefinition] = useState('');
  const [newSynonyms, setNewSynonyms] = useState('');
  const [newAntonyms, setNewAntonyms] = useState('');

  // Staged upload
  const [stagedData, setStagedData] = useState(null);
  const [stagedFileName, setStagedFileName] = useState('');
  const [stagedEntryCount, setStagedEntryCount] = useState(0);

  // Search & Display with server-side pagination
  const [allWords, setAllWords] = useState([]);
  const [activeSearch, setActiveSearch] = useState(''); // State for the committed search term
  const [searchResults, setSearchResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef(null); // Ref for input element
  const [totalPages, setTotalPages] = useState(1);
  const [totalWords, setTotalWords] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [editSynonyms, setEditSynonyms] = useState('');
  const [editAntonyms, setEditAntonyms] = useState('');

  const csvInputRef = useRef();
  const jsonInputRef = useRef();

  // Debounced handler for input changes
  const handleSearchChange = useDebouncedCallback((value) => {
    setActiveSearch(value);
    setCurrentPage(1);
    if (value.trim()) {
      searchWords(value);
    } else {
      setSearchResults([]);
      fetchWords(1, pageSize);
    }
  }, 300);

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
  };

  // Fetch words with pagination
  const fetchWords = useCallback(async (page = 1, limit = DEFAULT_PAGE_SIZE) => {
    try {
      setIsFetching(true);
      const res = await api.get(`/api/dictionary/words/all?page=${page}&limit=${limit}`);
      const data = res.data.data;
      // Handle paginated response
      if (data && data.words) {
        setAllWords(data.words);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalWords(data.pagination?.total || data.words.length);
        setCurrentPage(data.pagination?.page || 1);
      } else {
        // Fallback for old response format
        setAllWords(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      showMessage('Failed to load words', 'error');
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Search words via API
  const searchWords = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsFetching(true);
      const res = await api.get(`/api/dictionary/search/${encodeURIComponent(term)}`);
      const data = res.data.data;
      setSearchResults(Array.isArray(data) ? data : (data.words || []));
    } catch {
      setSearchResults([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Initial load and page size change
  useEffect(() => {
    fetchWords(1, pageSize);
  }, [pageSize, fetchWords]);

  const handleAddSingle = async () => {
    const word = sanitizeString(newWord.trim().toUpperCase());
    const definition = sanitizeString(newDefinition.trim());

    if (!word || !definition) {
      showMessage('Word and Definition are required', 'error');
      return;
    }

    // Format for POST /api/dictionary endpoint (single word creation)
    const singleData = {
      word: word,
      meanings: [{
        partOfSpeech: newPartOfSpeech || 'noun',
        definition: definition,
        synonyms: newSynonyms.split(',').map(s => sanitizeString(s.trim())).filter(Boolean),
        examples: []
      }],
      synonyms: newSynonyms.split(',').map(s => sanitizeString(s.trim())).filter(Boolean),
      antonyms: newAntonyms.split(',').map(s => sanitizeString(s.trim())).filter(Boolean)
    };

    try {
      setLoading(true);
      await api.post('/api/dictionary', singleData);
      showMessage('Word added successfully', 'success');
      setNewWord('');
      setNewDefinition('');
      setNewSynonyms('');
      setNewAntonyms('');
      await fetchWords(1, pageSize); // Refresh the word list
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to add word', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Stage CSV for preview
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
      const result = parseDictionaryCSV(text);

      if (!result.valid) {
        showMessage(result.errors.join(', '), 'error');
        e.target.value = '';
        return;
      }

      const count = Object.keys(result.data).length;
      setStagedData(result.data);
      setStagedFileName(file.name);
      setStagedEntryCount(count);
      showMessage(`Ready to upload ${count} words from ${file.name}`, 'info');
    } catch (err) {
      showMessage('Failed to parse CSV: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  // Stage JSON for preview
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

      const result = validateDictionaryData(parsed);
      if (!result.valid) {
        showMessage(result.errors.join(', '), 'error');
        e.target.value = '';
        return;
      }

      const count = Object.keys(result.data).length;
      setStagedData(result.data);
      setStagedFileName(file.name);
      setStagedEntryCount(count);
      showMessage(`Ready to upload ${count} words from ${file.name}`, 'info');
    } catch (err) {
      showMessage('Failed to parse JSON: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  // Confirm upload
  const handleConfirmUpload = async () => {
    if (!stagedData) {
      showMessage('No data staged for upload', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/dictionary/upload', stagedData, { timeout: 30000 });
      showMessage(`Successfully uploaded ${stagedEntryCount} words`, 'success');
      setStagedData(null);
      setStagedFileName('');
      setStagedEntryCount(0);
      await fetchWords(1, pageSize); // Refresh the word list
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
    setStagedEntryCount(0);
    showMessage('Upload cancelled', 'info');
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/dictionary/export/all');
      const data = res.data.data;

      const headers = ['word', 'partOfSpeech', 'definition', 'synonyms', 'antonyms'];
      const csvRows = [headers.join(',')];

      Object.entries(data).forEach(([word, wordData]) => {
        wordData.MEANINGS.forEach(m => {
          const row = [
            `"${word.replace(/"/g, '""')}"`,
            `"${(m[0] || '').replace(/"/g, '""')}"`,
            `"${(m[1] || '').replace(/"/g, '""')}"`,
            `"${(m[2] || []).join(';').replace(/"/g, '""')}"`,
            `"${(wordData.ANTONYMS || []).join(';').replace(/"/g, '""')}"`
          ];
          csvRows.push(row.join(','));
        });
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dictionary-${new Date().toISOString().slice(0, 10)}.csv`;
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

  const handleEdit = (wordData) => {
    setEditingId(wordData._id);
    setEditWord(wordData.word);
    setEditMeaning(wordData.meanings[0]?.definition || '');
    setEditSynonyms((wordData.synonyms || []).join(', '));
    setEditAntonyms((wordData.antonyms || []).join(', '));
  };

  const handleUpdate = async () => {
    if (!editWord.trim() || !editMeaning.trim()) {
      showMessage('Word and definition are required', 'error');
      return;
    }

    const updateData = {
      word: sanitizeString(editWord.trim().toUpperCase()),
      meanings: [{
        partOfSpeech: 'noun',
        definition: sanitizeString(editMeaning.trim()),
        synonyms: editSynonyms.split(',').map(s => sanitizeString(s.trim())).filter(Boolean),
        examples: []
      }],
      synonyms: editSynonyms.split(',').map(s => sanitizeString(s.trim())).filter(Boolean),
      antonyms: editAntonyms.split(',').map(s => sanitizeString(s.trim())).filter(Boolean)
    };

    try {
      setLoading(true);
      await api.put(`/api/dictionary/${editingId}`, updateData);
      showMessage('Word updated successfully', 'success');
      setEditingId(null);
      await fetchWords(currentPage, pageSize);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this word?')) return;

    try {
      setLoading(true);
      await api.delete(`/api/dictionary/${id}`);
      showMessage('Word deleted successfully', 'success');
      await fetchWords(currentPage, pageSize);
    } catch (err) {
      showMessage(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Use searchResults if searching, otherwise show all words
  const displayWords = activeSearch.trim() ? searchResults : allWords;
  // For search, use client-side pagination; for all words, server already paginated
  const displayTotalPages = activeSearch.trim() ? Math.ceil(searchResults.length / pageSize) || 1 : totalPages;
  const paginatedResults = activeSearch.trim()
    ? displayWords.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : displayWords; // Server already paginated

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>📖 Dictionary Manager</h2>
        <p style={styles.subheading}>Manage words, definitions, synonyms and antonyms</p>
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
        <h3 style={styles.cardTitle}>Add Single Word</h3>
        <div style={styles.formGrid}>
          <input placeholder="Word" value={newWord} onChange={e => setNewWord(e.target.value)} style={styles.input} disabled={loading} />
          <select value={newPartOfSpeech} onChange={e => setNewPartOfSpeech(e.target.value)} style={styles.input} disabled={loading}>
            <option value="noun">Noun</option>
            <option value="verb">Verb</option>
            <option value="adjective">Adjective</option>
            <option value="adverb">Adverb</option>
          </select>
          <input placeholder="Definition" value={newDefinition} onChange={e => setNewDefinition(e.target.value)} style={{ ...styles.input, gridColumn: 'span 2' }} disabled={loading} />
          <input placeholder="Synonyms (comma separated)" value={newSynonyms} onChange={e => setNewSynonyms(e.target.value)} style={styles.input} disabled={loading} />
          <input placeholder="Antonyms (comma separated)" value={newAntonyms} onChange={e => setNewAntonyms(e.target.value)} style={styles.input} disabled={loading} />
        </div>
        <button style={styles.primaryBtn} onClick={handleAddSingle} disabled={loading}>
          {loading ? 'Adding...' : 'Add Word'}
        </button>
      </div>

      {/* Bulk Upload */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Bulk Upload</h3>

        {stagedData ? (
          <div style={styles.stagedBox}>
            <div style={styles.stagedInfo}>
              <strong>📁 {stagedFileName}</strong>
              <span style={styles.stagedCount}>{stagedEntryCount} words ready</span>
            </div>
            <div style={styles.stagedPreview}>
              {Object.keys(stagedData).slice(0, 3).map((word, i) => (
                <div key={i} style={styles.previewItem}>{word}</div>
              ))}
              {stagedEntryCount > 3 && <div style={styles.previewMore}>...and {stagedEntryCount - 3} more</div>}
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
              <small style={styles.hint}>word,partOfSpeech,definition,synonyms,antonyms</small>
            </div>
            <div style={styles.uploadBox}>
              <p style={styles.label}>JSON File</p>
              <input type="file" accept=".json" ref={jsonInputRef} onChange={handleJSONSelect} disabled={loading} style={styles.fileInput} />
              <small style={styles.hint}>{`{"WORD": {MEANINGS: [...]}}`}</small>
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

      {/* Search */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Search Dictionary</h3>
        <div style={{ ...styles.row, position: 'relative' }}>
          <input
            placeholder="Start typing to search..."
            ref={searchInputRef}
            onChange={e => handleSearchChange(e.target.value)}
            style={{ ...styles.input, flex: 1 }}
          />
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Word</th>
              <th style={styles.th}>Meaning</th>
              <th style={styles.th}>Synonyms</th>
              <th style={styles.th}>Antonyms</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResults.length === 0 ? (
              <tr><td colSpan={5} style={styles.emptyCell}>{isFetching ? 'Searching...' : 'No results found. Try searching.'}</td></tr>
            ) : paginatedResults.map((wordData, idx) => (
              <tr key={wordData._id} style={idx % 2 === 0 ? styles.zebra : {}}>
                <td style={styles.td}>
                  {editingId === wordData._id ? <input value={editWord} onChange={e => setEditWord(e.target.value)} style={styles.input} /> : wordData.word}
                </td>
                <td style={styles.td}>
                  {editingId === wordData._id ? <input value={editMeaning} onChange={e => setEditMeaning(e.target.value)} style={styles.input} /> : wordData.meanings[0]?.definition || ''}
                </td>
                <td style={styles.td}>
                  {editingId === wordData._id ? <input value={editSynonyms} onChange={e => setEditSynonyms(e.target.value)} style={styles.input} /> : (wordData.synonyms || []).join(', ')}
                </td>
                <td style={styles.td}>
                  {editingId === wordData._id ? <input value={editAntonyms} onChange={e => setEditAntonyms(e.target.value)} style={styles.input} /> : (wordData.antonyms || []).join(', ')}
                </td>
                <td style={styles.td}>
                  <div style={styles.actionGroup}>
                    {editingId === wordData._id ? (
                      <>
                        <button style={styles.saveBtn} onClick={handleUpdate}><SaveIcon /> Save</button>
                        <button style={styles.cancelBtn} onClick={() => setEditingId(null)}><CancelIcon /> Cancel</button>
                      </>
                    ) : (
                      <>
                        <button style={styles.editBtn} onClick={() => handleEdit(wordData)}><EditIcon /> Edit</button>
                        <button style={styles.deleteBtn} onClick={() => handleDelete(wordData._id)}><DeleteIcon /> Delete</button>
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
          totalPages={displayTotalPages}
          totalItems={activeSearch.trim() ? searchResults.length : totalWords}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            if (!activeSearch.trim()) fetchWords(page, pageSize);
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
  container: { background: '#f8fafc', borderRadius: 16, padding: 24, maxWidth: 950, margin: '0 auto' },
  header: { marginBottom: 20 },
  heading: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 },
  subheading: { color: '#64748b', marginTop: 4, fontSize: '0.9rem' },
  message: { padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontWeight: 500 },
  card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #e2e8f0' },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#334155', margin: '0 0 12px 0' },
  row: { display: 'flex', gap: 12, alignItems: 'center' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' },
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
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
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
