import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [25, 50, 100],
    loading = false,
}) {
    const [jumpToPage, setJumpToPage] = useState('');

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const delta = 2; // Pages to show on each side of current

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > delta + 2) pages.push('...');

            const start = Math.max(2, currentPage - delta);
            const end = Math.min(totalPages - 1, currentPage + delta);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (currentPage < totalPages - delta - 1) pages.push('...');
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    const handleJumpToPage = (e) => {
        if (e.key === 'Enter') {
            const page = parseInt(jumpToPage, 10);
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                onPageChange(page);
            }
            setJumpToPage('');
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            marginTop: '1rem',
        }}>
            {/* Items count */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}-{endItem}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Page size selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rows per page:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
                        className="input-field"
                        style={{ padding: '0.25rem 0.5rem', width: 'auto' }}
                        disabled={loading}
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                {/* Navigation controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1 || loading}
                        title="First page"
                    >
                        <ChevronsLeft size={16} />
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        title="Previous page"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div style={{ display: 'flex', gap: '0.25rem', margin: '0 0.5rem' }}>
                        {getPageNumbers().map((page, idx) => (
                            page === '...' ? (
                                <span key={`ellipsis-${idx}`} style={{ padding: '0 0.5rem', color: 'var(--text-muted)' }}>...</span>
                            ) : (
                                <button
                                    key={page}
                                    className={`btn ${page === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        minWidth: '32px',
                                        background: page === currentPage ? 'var(--primary)' : 'white',
                                        color: page === currentPage ? 'white' : 'var(--text-primary)',
                                        border: page === currentPage ? 'none' : '1px solid var(--border)'
                                    }}
                                    onClick={() => onPageChange(page)}
                                    disabled={loading || page === currentPage}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>

                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        title="Next page"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages || loading}
                        title="Last page"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
