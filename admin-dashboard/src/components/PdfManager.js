import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import { usePdfEvents } from '../hooks/usePdfEvents';
import { useNotifications, NotificationToast } from '../hooks/useNotifications';
import Pagination from './Pagination';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

// SVG icons
const EditIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" /></svg>
);
const ViewIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
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

export default function PdfManager(props) {
  const [pdfs, setPdfs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Edit State
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFile, setEditFile] = useState(null);

  // Notifications
  const { notifications, addNotification, removeNotification } = useNotifications();

  // SSE Event Handlers
  const handlePdfAdded = useCallback((data) => {
    // SSE events only contain { id } for security - refresh list to get full data
    api.get('/api/pdfs/all', { params: { page: currentPage, limit: pageSize, search: searchTerm || undefined, category: selectedFilterCategory || undefined } })
      .then(res => {
        const resData = res.data.data || res.data;
        if (resData.documents) {
          setPdfs(resData.documents);
          setTotal(resData.pagination.total);
          setTotalPages(resData.pagination.totalPages);
        }
      })
      .catch(console.error);
    addNotification('📄 New PDF added', 'success');
    fetchCategories();
  }, [currentPage, pageSize, searchTerm, selectedFilterCategory, addNotification]);

  const handlePdfUpdated = useCallback((data) => {
    // Fetch the updated PDF to get fresh data
    if (data.id) {
      api.get(`/api/pdfs/admin/${data.id}`)
        .then(res => {
          const updatedPdf = res.data.data || res.data;
          setPdfs(prev => prev.map(pdf =>
            pdf._id === data.id ? { ...pdf, ...updatedPdf } : pdf
          ));
        })
        .catch(console.error);
    }
    addNotification('✏️ PDF updated', 'info');
    fetchCategories();
  }, [addNotification]);

  const handlePdfDeleted = useCallback((data) => {
    // Remove the PDF from the current list
    setPdfs(prev => prev.filter(pdf => pdf._id !== data.id));
    setTotal(prev => Math.max(0, prev - 1));
    addNotification('🗑️ PDF deleted', 'warning');
    fetchCategories();
  }, [addNotification]);

  // Subscribe to SSE events for real-time updates
  const { isConnected, connectionError } = usePdfEvents({
    onPdfAdded: handlePdfAdded,
    onPdfUpdated: handlePdfUpdated,
    onPdfDeleted: handlePdfDeleted,
    enabled: true,
  });

  // Fetch unique categories (for dropdowns)
  const fetchCategories = () => {
    api.get('/api/pdfs/categories')
      .then(res => setCategories(res.data.data || res.data || []))
      .catch(() => setCategories([]));
  };

  // Fetch PDFs (Server-Side Pagination)
  const fetchPdfs = useCallback(() => {
    setLoading(true);

    // Deep link handling: If targetPdfId is provided, fetch just that PDF
    // Usually via props from Dashboard
    const { targetPdfId, onClearTarget } = props; // Assuming these are passed in props

    if (targetPdfId) {
      // Use the dedicated admin route to prevent view count increment
      api.get(`/api/pdfs/admin/${targetPdfId}`)
        .then(res => {
          const pdf = res.data.data || res.data;
          setPdfs([pdf]); // Show only this PDF
          setTotal(1);
          setTotalPages(1);
          // Optional: Open edit mode automatically?
          // startEditing(pdf); 
        })
        .catch(err => {
          console.warn("Admin PDF fetch failed, falling back to standard fetch (View count will increment):", err);

          // Fallback to normal fetch
          api.get(`/api/pdfs/${targetPdfId}`)
            .then(res => {
              const pdf = res.data.data || res.data;
              setPdfs([pdf]);
              setTotal(1);
              setTotalPages(1);
            })
            .catch(fallbackErr => {
              console.error("Fetch target PDF error:", fallbackErr);
              alert("Could not find the requested PDF");
              if (onClearTarget) onClearTarget();
            });
        })
        .finally(() => setLoading(false));
      return;
    }

    const params = {
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      category: selectedFilterCategory || undefined
    };

    let endpoint = '/api/pdfs/all';
    if (searchTerm) {
      endpoint = '/api/pdfs';
    }

    api.get(endpoint, { params })
      .then(res => {
        const data = res.data.data || res.data;
        if (data.documents) {
          setPdfs(data.documents);
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        } else if (Array.isArray(data)) {
          // Fallback if backend returns array
          setPdfs(data);
        }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setPdfs([]);
      })
      .finally(() => setLoading(false));
  }, [currentPage, pageSize, searchTerm, selectedFilterCategory, props]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === '__new__') {
      setShowNewCategoryInput(true);
      setNewCategory('');
      setCategory('');
    } else {
      setCategory(value);
      setShowNewCategoryInput(false);
      setNewCategory('');
    }
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      setCategory(newCategory.trim());
      setShowNewCategoryInput(false);
    }
  };

  const handleDeletePdf = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PDF?')) return;
    try {
      await api.delete(`/api/pdfs/${id}`);
      fetchPdfs();
      fetchCategories(); // Update categories just in case
    } catch {
      alert('Delete failed');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to page 1 on search
  };

  const handleCategoryFilter = (e) => {
    setSelectedFilterCategory(e.target.value);
    setCurrentPage(1); // Reset to page 1 on filter
  };

  const handleUpload = async () => {
    const usedCategory = showNewCategoryInput && newCategory.trim() ? newCategory.trim() : category.trim();
    if (!file || !title.trim() || !usedCategory) {
      alert('Please provide PDF file, title, and category');
      return;
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Invalid file type. Please upload a PDF file only.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category', usedCategory);
    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);

      try {
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        canvas.toBlob(async (blob) => {
          if (blob) formData.append('thumbnail', blob, 'thumbnail.jpg');
          try {
            await api.post('/api/pdfs/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('PDF uploaded');
            setFile(null);
            setTitle('');
            setContent('');
            setCategory('');
            setShowNewCategoryInput(false);
            setNewCategory('');
            fetchPdfs();
            fetchCategories();
          } catch (err) {
            alert(err.response?.data?.message || err.response?.data?.msg || 'Upload error');
          }
        }, 'image/jpeg');
      } catch (pdfError) {
        console.error('PDF processing error:', pdfError);
        alert('Invalid PDF file. The file appears to be corrupted or is not a valid PDF document.');
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const startEditing = (pdf) => {
    setEditId(pdf._id);
    setEditTitle(pdf.title);
    setEditContent(pdf.content);
    setEditCategory(pdf.category);
    setEditFile(null);
  };

  const handleUpdatePdf = async (id) => {
    if (!editTitle.trim() || !editCategory.trim()) {
      alert('Please provide title and category');
      return;
    }
    const formData = new FormData();
    formData.append('title', editTitle);
    formData.append('content', editContent);
    formData.append('category', editCategory);
    if (editFile) formData.append('pdf', editFile);
    try {
      await api.put(`/api/pdfs/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('PDF updated successfully');
      setEditId(null);
      fetchPdfs();
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.msg || 'Update failed');
    }
  };



  return (
    <div style={styles.wrapper}>
      {/* Toast Notifications */}
      <NotificationToast notifications={notifications} onRemove={removeNotification} />

      {/* Connection Status */}
      <div style={styles.connectionStatus}>
        <span style={{
          ...styles.connectionDot,
          background: isConnected ? '#22c55e' : connectionError ? '#ef4444' : '#f59e0b'
        }} />
        <span style={styles.connectionText}>
          {isConnected ? 'Live updates active' : connectionError ? `Connection error: ${connectionError}` : 'Connecting...'}
        </span>
      </div>

      <h2>Upload PDF</h2>
      <input
        type="file"
        accept="application/pdf"
        onChange={e => setFile(e.target.files[0])}
        style={styles.input}
      />
      <input
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={styles.input}
      />
      <input
        placeholder="Content/Description"
        value={content}
        onChange={e => setContent(e.target.value)}
        style={styles.input}
      />
      <select
        value={showNewCategoryInput ? '__new__' : category}
        onChange={handleCategoryChange}
        style={styles.input}
      >
        <option value="">Select Category</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
        <option value="__new__">Create new category...</option>
      </select>
      {showNewCategoryInput && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="New category name"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            style={styles.input}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddNewCategory();
            }}
          />
          <button style={styles.button} type="button" onClick={handleAddNewCategory}>
            Add
          </button>
        </div>
      )}
      <button style={styles.button} onClick={handleUpload}>Upload PDF</button>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '32px 0 16px 0' }}>
        <input
          style={styles.input}
          placeholder="Search by title or content..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <select
          value={selectedFilterCategory}
          onChange={handleCategoryFilter}
          style={styles.select}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Views</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
          ) : pdfs.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No PDFs found.</td></tr>
          ) : pdfs.map((pdf, index) => (
            <tr key={pdf._id} style={index % 2 === 0 ? styles.zebra : {}}>
              <td style={styles.td}>
                {editId === pdf._id ? (
                  <input
                    style={styles.input}
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  />
                ) : (
                  pdf.title
                )}
              </td>
              <td style={styles.td}>
                {editId === pdf._id ? (
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  pdf.category
                )}
              </td>
              <td style={styles.td}>{pdf.viewCount}</td>
              <td style={styles.td}>
                <div style={styles.actionGroup}>
                  {editId === pdf._id ? (
                    <>
                      <input
                        style={styles.input}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        placeholder="Edit Content"
                      />
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={e => setEditFile(e.target.files[0])}
                        style={styles.input}
                      />
                      <button
                        style={styles.ghostButtonSave}
                        title="Save"
                        onClick={() => handleUpdatePdf(pdf._id)}
                      ><SaveIcon /><span className="btn-label">Save</span></button>
                      <button
                        style={styles.ghostButtonCancel}
                        title="Cancel"
                        onClick={() => setEditId(null)}
                      ><CancelIcon /><span className="btn-label">Cancel</span></button>
                    </>
                  ) : (
                    <>
                      <button
                        style={styles.ghostButtonEdit}
                        title="Edit"
                        onClick={() => startEditing(pdf)}
                      ><EditIcon /><span className="btn-label">Edit</span></button>
                      <button
                        style={styles.ghostButtonView}
                        title="View PDF"
                        onClick={() => window.open(`${api.defaults.baseURL}${pdf.pdfUrl}`, '_blank')}
                      ><ViewIcon /><span className="btn-label">View</span></button>
                      <button
                        style={styles.ghostButtonDelete}
                        title="Delete"
                        onClick={() => handleDeletePdf(pdf._id)}
                      ><DeleteIcon /><span className="btn-label">Delete</span></button>
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
        totalItems={total}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        loading={loading}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    marginTop: 16,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  th: {
    background: '#e5e7eb', // darker header for better contrast
    color: '#222',
    fontWeight: 600,
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
  },
  zebra: {
    background: '#f1f5f9', // slightly darker for more noticeable alternate row
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '8px',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginBottom: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
    marginRight: '8px',
    marginBottom: '8px',
  },
  actionGroup: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  ghostButtonEdit: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #d1d5db', color: '#6b7280',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  ghostButtonView: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #dbeafe', color: '#2563eb',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  ghostButtonDelete: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #fee2e2', color: '#dc3545',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  ghostButtonSave: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #bbf7d0', color: '#22c55e',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  ghostButtonCancel: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #fca5a5', color: '#ef4444',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: 8,
    marginBottom: 16,
    border: '1px solid #e2e8f0',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  connectionText: {
    fontSize: 13,
    color: '#64748b',
  },
};
