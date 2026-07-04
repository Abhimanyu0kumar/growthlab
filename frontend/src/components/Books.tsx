'use client';

import React, { useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, BookOpen, Download, Upload, AlertCircle, FileText, CheckCircle, Calendar, Clock, Check } from 'lucide-react';
import { Book } from '@/lib/db';

interface BooksProps {
  books: Book[];
  onAction: (action: 'create' | 'update' | 'delete', item: any) => Promise<void>;
  onFileUpload: (file: File, bookId: string) => Promise<any>;
}

export default function Books({ books = [], onAction, onFileUpload }: BooksProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; title: string } | null>(null);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // View Modes: standard tab grid vs daily sidebar breakdown
  const [viewMode, setViewMode] = useState<'standard' | 'days'>('days');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // File upload indicator states
  const [uploadingBookId, setUploadingBookId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('General');
  const [status, setStatus] = useState<'in_progress' | 'paused' | 'completed' | 'incomplete'>('in_progress');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [createdAtDate, setCreatedAtDate] = useState<string>(todayStr);

  // Predefined Categories
  const categoriesList = Array.from(new Set(['General', 'Self-Help', 'Technical', 'Fiction', 'Business/Finance', 'Biography', ...books.map(b => b.category)]));

  // Filter books
  const filteredBooks = books.filter(b => {
    const matchesCategory = selectedCategoryFilter === 'all' || (b.category || 'General') === selectedCategoryFilter;
    const matchesSearch = 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (b.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? b.status === statusFilter : true;
    const matchesDate = dateFilter ? b.createdAt.split('T')[0] === dateFilter : true;
    return matchesCategory && matchesSearch && matchesStatus && matchesDate;
  });

  // Group books by creation date
  const groupedBooks = filteredBooks.reduce((acc, book) => {
    const dateKey = book.createdAt.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(book);
    return acc;
  }, {} as Record<string, Book[]>);

  // Sort dates descending
  const bookDates = Object.keys(groupedBooks).sort((a, b) => b.localeCompare(a));
  
  // Ensure "Today" is always present in day list
  const allBookDates = bookDates.includes(todayStr) 
    ? bookDates 
    : [todayStr, ...bookDates];

  // Separate Today vs History
  const historyDates = allBookDates.filter(d => d !== todayStr);

  const formatDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentItemId(null);
    setTitle('');
    setAuthor('');
    setCategory('General');
    setStatus('in_progress');
    setCustomCategory('');
    setShowCustomCategoryInput(false);
    setAttachedFile(null);
    setCreatedAtDate(selectedDate);
    setIsModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    setModalMode('edit');
    setCurrentItemId(book.id);
    setTitle(book.title);
    setAuthor(book.author);
    setCategory(categoriesList.includes(book.category) ? book.category : 'custom');
    if (!categoriesList.includes(book.category)) {
      setCustomCategory(book.category);
      setShowCustomCategoryInput(true);
    } else {
      setCustomCategory('');
      setShowCustomCategoryInput(false);
    }
    setStatus(book.status);
    setAttachedFile(null);
    setCreatedAtDate(book.createdAt.split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCategory = showCustomCategoryInput && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    let finalCreatedAt: string | undefined;
    if (createdAtDate) {
      const originalItem = books.find(t => t.id === currentItemId);
      if (originalItem && originalItem.createdAt.startsWith(createdAtDate)) {
        finalCreatedAt = originalItem.createdAt;
      } else {
        finalCreatedAt = new Date(`${createdAtDate}T12:00:00`).toISOString();
      }
    }

    if (modalMode === 'create') {
      await onAction('create', {
        title: title.trim(),
        author: author.trim(),
        category: finalCategory,
        status,
        fileName: attachedFile ? attachedFile.name : null,
        fileMimeType: attachedFile ? attachedFile.type : null,
        createdAt: finalCreatedAt
      });
    } else if (modalMode === 'edit' && currentItemId) {
      await onAction('update', {
        id: currentItemId,
        title: title.trim(),
        author: author.trim(),
        category: finalCategory,
        status,
        createdAt: finalCreatedAt
      });
    }

    setIsModalOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploadingBookId(bookId);
    try {
      await onFileUpload(file, bookId);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload and encrypt book file.');
    } finally {
      setUploadingBookId(null);
    }
  };

  const triggerFileInput = (bookId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.bookId = bookId;
      fileInputRef.current.click();
    }
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirmItem({ id, title });
  };

  const handleMarkAsRead = async (book: Book) => {
    await onAction('update', {
      ...book,
      status: 'completed'
    });
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'in_progress': return 'Reading';
      case 'paused': return 'On Hold';
      case 'completed': return 'Read / Done';
      case 'incomplete': return 'Incomplete';
      default: return s;
    }
  };

  const getStatusBadgeClass = (s: string) => {
    return `badge badge-${s}`;
  };

  const renderBookCard = (book: Book) => {
    const isCompleted = book.status === 'completed';
    return (
      <div key={book.id} className="glass-panel item-card book-card">
        {/* Subtle top-right actions shown on card hover */}
        <div className="card-hover-actions">
          <button
            type="button"
            className="card-hover-btn"
            onClick={() => openEditModal(book)}
            title="Edit Book Details"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="card-hover-btn btn-danger"
            onClick={() => handleDelete(book.id, book.title)}
            title="Delete Book"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Title row with circle checkbox */}
        <div className="card-title-row">
          <div className="custom-checkbox-wrapper">
            <button
              type="button"
              className={`custom-checkbox ${isCompleted ? 'checked' : ''}`}
              onClick={() => handleMarkAsRead(book)}
              disabled={isCompleted}
              title={isCompleted ? 'Finished Reading' : 'Mark as Read'}
            >
              {isCompleted && <Check size={11} style={{ color: '#ffffff' }} />}
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <div className="book-category-tag" style={{ display: 'inline-block', marginBottom: '0.15rem' }}>{book.category || 'General'}</div>
            <span className={`item-title ${isCompleted ? 'completed' : ''}`} style={{ fontSize: '1.2rem', display: 'block' }}>
              {book.title}
            </span>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
              by {book.author || 'Unknown Author'}
            </div>
          </div>
          <span className={getStatusBadgeClass(book.status)} style={{ flexShrink: 0 }}>
            {getStatusLabel(book.status)}
          </span>
        </div>

        {/* Uploaded File Details */}
        {book.fileName ? (
          <div className="book-attachment-badge" style={{ marginTop: '0.5rem' }}>
            <FileText size={16} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={book.fileName}>
              {book.fileName}
            </span>
            <a
              id={`download-book-file-${book.id}`}
              href={`/api/books?id=${book.id}`}
              className="btn btn-sm btn-secondary"
              style={{ padding: '0.25rem 0.5rem', width: 'auto', display: 'flex', alignItems: 'center' }}
              title="Download/Read Document (Decrypted on-the-fly)"
              download={book.fileName}
            >
              <Download size={14} />
            </a>
          </div>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            <button
              id={`upload-book-file-btn-${book.id}`}
              className="btn btn-sm btn-secondary"
              style={{ width: '100%', fontSize: '0.8rem', gap: '0.25rem' }}
              onClick={() => triggerFileInput(book.id)}
              disabled={uploadingBookId === book.id}
            >
              <Upload size={14} />
              <span>{uploadingBookId === book.id ? 'Encrypting & Uploading...' : 'Upload Book File (PDF/EPUB/TXT)'}</span>
            </button>
          </div>
        )}

        <div className="item-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={11} />
            <span>Added: {new Date(book.createdAt).toLocaleDateString()}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="view-header">
        <div>
          <h1 className="view-title">Books Tracker</h1>
          <p className="view-subtitle">Organize your reading library, upload book documents securely, and mark your reading achievements.</p>
        </div>
        <button 
          id="add-book-btn"
          className="btn" 
          style={{ width: 'auto' }} 
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span>Add Book</span>
        </button>
      </div>

      <div className="tab-container">
        {/* View Mode Toggle Pill Selector */}
        <div className="view-mode-selector">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'days' ? 'active' : ''}`}
            onClick={() => setViewMode('days')}
          >
            📅 Group by Day
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'standard' ? 'active' : ''}`}
            onClick={() => setViewMode('standard')}
          >
            📋 Standard View
          </button>
        </div>

        {/* Category filtering Pills */}
        <div className="categories-container">
          <button
            id="category-pill-all"
            className={`category-pill ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategoryFilter('all')}
          >
            All Categories ({books.length})
          </button>
          {categoriesList.filter(Boolean).map((cat) => {
            const count = books.filter(b => (b.category || 'General') === cat).length;
            if (count === 0 && cat !== 'General') return null;
            return (
              <button
                key={cat}
                id={`category-pill-${cat?.toLowerCase().replace(/\s+/g, '-')}`}
                className={`category-pill ${selectedCategoryFilter === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search and Filter controls */}
        <div className="list-controls" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
            <div className="search-input-wrapper" style={{ maxWidth: '320px', flex: 1 }}>
              <Search size={18} />
              <input
                id="book-search-input"
                type="text"
                className="form-input"
                placeholder="Search by title, author, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                id="book-filter-status"
                className="form-input"
                style={{ width: '150px', height: '42px', padding: '0 0.75rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="in_progress">Reading</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date:</span>
                <input
                  id="book-filter-date"
                  type="date"
                  className="form-input"
                  style={{ width: '160px', height: '42px', padding: '0 0.75rem' }}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              {(statusFilter || dateFilter || searchQuery || selectedCategoryFilter !== 'all') && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', height: '42px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setStatusFilter('');
                    setDateFilter('');
                    setSearchQuery('');
                    setSelectedCategoryFilter('all');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden File Input for uploading */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => {
            const bookId = fileInputRef.current?.dataset.bookId;
            if (bookId) handleFileChange(e, bookId);
          }}
        />

        {/* Books List Presentation */}
        {viewMode === 'days' ? (
          <div className="days-layout">
            {/* Left sidebar list of days */}
            <div className="days-sidebar glass-panel">
              <span className="days-sidebar-title">Active</span>
              <div className="days-sidebar-list">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`day-item-btn ${selectedDate === todayStr ? 'active' : ''}`}
                >
                  <div className="day-item-date">Today</div>
                  <span className="day-item-badge">{groupedBooks[todayStr]?.length || 0}</span>
                </button>
              </div>

              {historyDates.length > 0 && (
                <>
                  <span className="history-section-header">History</span>
                  <div className="days-sidebar-list">
                    {historyDates.map((dateStr) => {
                      const count = groupedBooks[dateStr]?.length || 0;
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => setSelectedDate(dateStr)}
                          className={`day-item-btn ${selectedDate === dateStr ? 'active' : ''}`}
                        >
                          <div className="day-item-date">{formatDate(dateStr)}</div>
                          <span className="day-item-badge">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right content detailing books for selected day */}
            <div className="days-content">
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Books Added on: {formatDate(selectedDate)}
                </span>
                <button
                  className="btn btn-sm"
                  style={{ width: 'auto', padding: '0.4rem 1rem' }}
                  onClick={openCreateModal}
                >
                  <Plus size={14} />
                  <span>Add Book</span>
                </button>
              </div>

              {(!groupedBooks[selectedDate] || groupedBooks[selectedDate].length === 0) ? (
                <div className="glass-panel empty-state">
                  <BookOpen size={48} />
                  <div className="empty-state-title">No books added this day</div>
                  <p>
                    {searchQuery 
                      ? 'Try searching with other keywords.' 
                      : `You haven't added any books on this day. Press 'Add Book' to begin.`}
                  </p>
                </div>
              ) : (
                <div className="items-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {groupedBooks[selectedDate].map((book) => renderBookCard(book))}
                </div>
              )}
            </div>
          </div>
        ) : (
          filteredBooks.length === 0 ? (
            <div className="glass-panel empty-state">
              <BookOpen size={48} />
              <div className="empty-state-title">No books found</div>
              <p>
                {searchQuery 
                  ? 'Try searching with other keywords.' 
                  : 'Your library is empty. Click Add Book to start building your reading tracker.'}
              </p>
            </div>
          ) : (
            <div className="items-grid">
              {filteredBooks.map((book) => renderBookCard(book))}
            </div>
          )
        )}
      </div>

      {/* Book Metadata Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'create' ? 'Add Book details' : 'Edit Book details'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="book-form-title">Book Title</label>
                <input
                  id="book-form-title"
                  type="text"
                  className="form-input"
                  placeholder="E.g., Atomic Habits"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="book-form-author">Author</label>
                <input
                  id="book-form-author"
                  type="text"
                  className="form-input"
                  placeholder="E.g., James Clear"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="book-form-date">Addition Date</label>
                <input
                  id="book-form-date"
                  type="date"
                  className="form-input"
                  required
                  value={createdAtDate}
                  onChange={(e) => setCreatedAtDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="book-form-category">Category</label>
                <select
                  id="book-form-category"
                  className="form-input"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value === 'custom') {
                      setShowCustomCategoryInput(true);
                    } else {
                      setShowCustomCategoryInput(false);
                    }
                  }}
                >
                  <option value="General">General</option>
                  <option value="Self-Help">Self-Help</option>
                  <option value="Technical">Technical</option>
                  <option value="Fiction">Fiction</option>
                  <option value="Business/Finance">Business/Finance</option>
                  <option value="Biography">Biography</option>
                  <option value="custom">+ Create Custom Category</option>
                </select>
              </div>

              {showCustomCategoryInput && (
                <div className="form-group">
                  <label className="form-label" htmlFor="book-form-custom-category">Custom Category Name</label>
                  <input
                    id="book-form-custom-category"
                    type="text"
                    className="form-input"
                    placeholder="E.g., Psychology, Communication"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="book-form-status">Status</label>
                <select
                  id="book-form-status"
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="in_progress">Reading</option>
                  <option value="paused">On Hold</option>
                  <option value="completed">Read / Done</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  id="book-form-cancel"
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="book-form-submit"
                  type="submit"
                  className="btn"
                  style={{ width: 'auto' }}
                >
                  {modalMode === 'create' ? 'Add Book' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmItem && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmItem(null)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#ef4444' }}>Confirm Deletion</h2>
              <button className="modal-close-btn" onClick={() => setDeleteConfirmItem(null)}>&times;</button>
            </div>
            <div style={{ margin: '1rem 0', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Are you sure you want to delete the book <strong>{deleteConfirmItem.title}</strong>? This action is permanent and will also delete any uploaded document.
            </div>
            <div className="form-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', marginBottom: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmItem(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: '#ef4444', borderColor: '#f87171', color: '#ffffff', flex: 1 }}
                onClick={async () => {
                  await onAction('delete', { id: deleteConfirmItem.id });
                  setDeleteConfirmItem(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
