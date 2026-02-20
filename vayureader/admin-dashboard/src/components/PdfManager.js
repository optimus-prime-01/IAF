import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import * as pdfjsLib from 'pdfjs-dist/webpack';
import { usePdfEvents } from '../hooks/usePdfEvents';
import { useNotifications, NotificationToast } from '../hooks/useNotifications';
import Pagination from './Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, Eye, Trash2, Save, X, FileUp, Search, Filter, Plus, UploadCloud, FileText, CheckCircle } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function PdfManager(props) {
  const [pdfs, setPdfs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

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

  // SSE & API Logic
  const handlePdfAdded = useCallback((data) => {
    fetchPdfs();
    fetchCategories();
  }, []);

  const handlePdfUpdated = useCallback((data) => {
    if (data.id) {
      api.get(`/api/pdfs/admin/${data.id}`).then(res => {
        const updatedPdf = res.data.data || res.data;
        setPdfs(prev => prev.map(p => p._id === data.id ? { ...p, ...updatedPdf } : p));
      });
    }
    fetchCategories();
  }, []);

  const handlePdfDeleted = useCallback((data) => {
    setPdfs(prev => prev.filter(p => p._id !== data.id));
    setTotal(prev => Math.max(0, prev - 1));
    fetchCategories();
  }, []);

  const { isConnected, connectionError } = usePdfEvents({
    onPdfAdded: handlePdfAdded,
    onPdfUpdated: handlePdfUpdated,
    onPdfDeleted: handlePdfDeleted,
    enabled: true,
  });

  const fetchCategories = () => {
    api.get('/api/pdfs/categories')
      .then(res => setCategories(res.data.data || res.data || []))
      .catch(() => setCategories([]));
  };

  const fetchPdfs = useCallback(() => {
    setLoading(true);
    const { targetPdfId } = props;

    if (targetPdfId) {
      api.get(`/api/pdfs/admin/${targetPdfId}`)
        .then(res => {
          const pdf = res.data.data || res.data;
          setPdfs([pdf]);
          setTotal(1);
          setTotalPages(1);
        })
        .catch(() => {
          api.get(`/api/pdfs/${targetPdfId}`)
            .then(res => {
              const pdf = res.data.data || res.data;
              setPdfs([pdf]);
              setTotal(1);
              setTotalPages(1);
            })
            .catch(() => {
              addNotification("PDF not found or has been deleted", "error");
              if (props.onClearTarget) {
                props.onClearTarget();
              }
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

    const endpoint = searchTerm ? '/api/pdfs' : '/api/pdfs/all';

    api.get(endpoint, { params })
      .then(res => {
        const data = res.data.data || res.data;
        if (data.documents) {
          setPdfs(data.documents);
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        } else if (Array.isArray(data)) setPdfs(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentPage, pageSize, searchTerm, selectedFilterCategory, props]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  // Handlers
  const handleCategoryChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setShowNewCategoryInput(true);
      setNewCategory('');
      setCategory('');
    } else {
      setCategory(val);
      setShowNewCategoryInput(false);
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
      fetchCategories();
      addNotification('PDF deleted successfully', 'success');
    } catch {
      addNotification('Failed to delete PDF', 'error');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (e) => {
    setSelectedFilterCategory(e.target.value);
    setCurrentPage(1);
  };

  const startEditing = (pdf) => {
    setEditId(pdf._id);
    setEditTitle(pdf.title);
    setEditContent(pdf.content);
    setEditCategory(pdf.category);
    setEditFile(null);
  };

  const handleUpload = async () => {
    const usedCategory = showNewCategoryInput && newCategory.trim() ? newCategory.trim() : category.trim();
    if (!file || !title.trim() || !usedCategory) return addNotification('Please fill in all required fields (File, Title, Category).', 'error');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category', usedCategory);

    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
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
            addNotification('PDF uploaded successfully!', 'success');
            setFile(null);
            setTitle('');
            setContent('');
            setCategory('');
            setShowNewCategoryInput(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchPdfs();
            fetchCategories();
          } catch (e) {
            addNotification(e.response?.data?.message || 'Upload failed.', 'error');
          }
        }, 'image/jpeg');
      } catch (e) {
        console.error(e);
        addNotification('Invalid PDF file.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpdatePdf = async (id) => {
    if (!editTitle.trim() || !editCategory.trim()) return addNotification('Title and Category are required.', 'error');

    const formData = new FormData();
    formData.append('title', editTitle);
    formData.append('content', editContent);
    formData.append('category', editCategory);
    if (editFile) formData.append('pdf', editFile);

    try {
      await api.put(`/api/pdfs/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addNotification('PDF updated successfully.', 'success');
      setEditId(null);
      fetchPdfs();
    } catch (e) {
      addNotification('Failed to update PDF.', 'error');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0 && droppedFiles[0].type === 'application/pdf') {
      setFile(droppedFiles[0]);
    } else {
      addNotification('Please drop a valid PDF file.', 'error');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        .pdf-manager-container {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .pdf-manager-container {
            grid-template-columns: 1fr;
          }
        }

        .upload-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          position: sticky;
          top: 2rem;
        }

        .upload-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .upload-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 2.5rem 1.5rem;
          text-align: center;
          cursor: pointer;
          background: #f9fafb;
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }

        .drop-zone:hover {
          border-color: #4f46e5;
          background: #eef2ff;
        }

        .drop-zone.drag-over {
          border-color: #4f46e5;
          background: #eef2ff;
          transform: scale(1.02);
        }

        .drop-zone-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          color: #6b7280;
        }

        .drop-zone.drag-over .drop-zone-icon,
        .drop-zone:hover .drop-zone-icon {
          color: #4f46e5;
        }

        .drop-zone-text {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0.5rem 0 0;
        }

        .file-selected {
          background: #ecfdf5;
          border-color: #10b981;
        }

        .file-selected .drop-zone-icon {
          color: #10b981;
        }

        .file-name {
          font-weight: 600;
          color: #059669;
          margin-bottom: 0.5rem;
          word-break: break-word;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .form-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
          font-family: inherit;
        }

        .btn-upload {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-upload:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .btn-upload:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .category-input-group {
          display: flex;
          gap: 0.5rem;
        }

        .category-input-group .form-input {
          flex: 1;
        }

        .btn-add-category {
          padding: 0.625rem 0.875rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-add-category:hover {
          background: #e5e7eb;
        }

        .list-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }

        .list-header {
          margin-bottom: 1.5rem;
        }

        .search-filters {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 640px) {
          .search-filters {
            grid-template-columns: 1fr;
          }
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 0.875rem;
          color: #9ca3af;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 0.875rem 0.625rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .filter-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 200px;
        }

        .filter-icon {
          position: absolute;
          left: 0.875rem;
          color: #9ca3af;
          pointer-events: none;
        }

        .filter-select {
          width: 100%;
          padding: 0.625rem 0.875rem 0.625rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        .pdf-table {
          width: 100%;
          border-collapse: collapse;
        }

        .pdf-table thead {
          background: #f9fafb;
        }

        .pdf-table th {
          padding: 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e5e7eb;
        }

        .pdf-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .pdf-table tbody tr:hover {
          background: #f9fafb;
        }

        .pdf-table tbody tr:last-child td {
          border-bottom: none;
        }

        .badge {
          display: inline-flex;
          padding: 0.25rem 0.75rem;
          background: #f3f4f6;
          color: #374151;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .btn-icon {
          padding: 0.5rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-icon:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .btn-icon.danger:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .btn-icon.primary:hover {
          background: #eef2ff;
          color: #4f46e5;
        }

        .btn-icon.success:hover {
          background: #dcfce7;
          color: #16a34a;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #9ca3af;
        }

        .pdf-title {
          font-weight: 500;
          color: #111827;
        }

        .view-count {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .edit-input {
          padding: 0.375rem 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          width: 100%;
        }

        .edit-input:focus {
          outline: none;
          border-color: #4f46e5;
        }
      `}</style>

      <div className="pdf-manager-container">
        {/* Upload Section */}
        <div className="upload-card">
          <div className="upload-header">
            <FileText size={24} color="#4f46e5" />
            <h2 className="upload-title">Upload PDF</h2>
          </div>

          {/* Drop Zone */}
          <div
            className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${file ? 'file-selected' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            {file ? (
              <>
                <CheckCircle className="drop-zone-icon" size={48} />
                <div className="file-name">{file.name}</div>
                <p className="drop-zone-text">Click or drag to replace</p>
              </>
            ) : (
              <>
                <UploadCloud className="drop-zone-icon" size={48} />
                <p style={{ margin: 0, fontWeight: 500, color: '#374151' }}>
                  Click to upload or drag PDF
                </p>
                <p className="drop-zone-text">PDF files only</p>
              </>
            )}
          </div>

          {/* Form Fields */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              placeholder="Enter PDF title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              placeholder="Enter description (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-input form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              value={showNewCategoryInput ? '__new__' : category}
              onChange={handleCategoryChange}
              className="form-input"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="__new__">+ New Category</option>
            </select>
          </div>

          <AnimatePresence>
            {showNewCategoryInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="form-group"
              >
                <div className="category-input-group">
                  <input
                    placeholder="New category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="form-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddNewCategory();
                    }}
                  />
                  <button
                    className="btn-add-category"
                    onClick={handleAddNewCategory}
                    title="Add Category"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            className="btn-upload"
            onClick={handleUpload}
            disabled={!file || !title || (showNewCategoryInput ? !newCategory.trim() : !category)}
          >
            <UploadCloud size={18} />
            Upload PDF
          </button>
        </div>

        {/* PDF List Section */}
        <div className="list-card">
          <div className="list-header">
            <div className="search-filters">
              <div className="search-wrapper">
                <Search className="search-icon" size={18} />
                <input
                  className="search-input"
                  placeholder="Search PDFs..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
              <div className="filter-wrapper">
                <Filter className="filter-icon" size={18} />
                <select
                  value={selectedFilterCategory}
                  onChange={handleCategoryFilter}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Views</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="empty-state">Loading...</td>
                  </tr>
                ) : pdfs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-state">No PDFs found</td>
                  </tr>
                ) : (
                  pdfs.map((pdf) => (
                    <motion.tr
                      key={pdf._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      <td>
                        {editId === pdf._id ? (
                          <input
                            className="edit-input"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                        ) : (
                          <span className="pdf-title">{pdf.title}</span>
                        )}
                      </td>
                      <td>
                        {editId === pdf._id ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="edit-input"
                          >
                            <option value="">Select</option>
                            {categories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="badge">{pdf.category}</span>
                        )}
                      </td>
                      <td>
                        <span className="view-count">{pdf.viewCount}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {editId === pdf._id ? (
                            <>
                              <button
                                className="btn-icon success"
                                onClick={() => handleUpdatePdf(pdf._id)}
                                title="Save"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                className="btn-icon danger"
                                onClick={() => setEditId(null)}
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-icon"
                                onClick={() => startEditing(pdf)}
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                className="btn-icon primary"
                                onClick={() => window.open(`${api.defaults.baseURL}${pdf.pdfUrl}`, '_blank')}
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className="btn-icon danger"
                                onClick={() => handleDeletePdf(pdf._id)}
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
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
        </div>
      </div>

      <NotificationToast
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}