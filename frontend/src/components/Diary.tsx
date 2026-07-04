'use client';

import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, BookOpen, Clock, Heart } from 'lucide-react';
import { DiaryEntry } from '@/lib/db';

interface DiaryProps {
  diary: DiaryEntry[];
  onAction: (action: 'create' | 'update' | 'delete', item: any) => Promise<void>;
}

export default function Diary({ diary = [], onAction }: DiaryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // View Modes: standard timeline vs daily sidebar breakdown
  const [viewMode, setViewMode] = useState<'standard' | 'days'>('days');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Form State
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'in_progress' | 'paused' | 'completed' | 'incomplete'>('completed');

  // Sort diary entries by date descending (newest first)
  const sortedDiary = [...diary].sort((a, b) => b.date.localeCompare(a.date));

  // Filter based on search query, status, and date
  const filteredDiary = sortedDiary.filter(d => {
    const matchesSearch = 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.date.includes(searchQuery);
    const matchesStatus = statusFilter ? d.status === statusFilter : true;
    const matchesDate = dateFilter ? d.date === dateFilter : true;
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Group diary by date
  const groupedDiary = filteredDiary.reduce((acc, entry) => {
    const dateKey = entry.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, DiaryEntry[]>);

  // Sort dates descending
  const diaryDates = Object.keys(groupedDiary).sort((a, b) => b.localeCompare(a));
  
  // Ensure "Today" is always present in day list
  const allDiaryDates = diaryDates.includes(todayStr) 
    ? diaryDates 
    : [todayStr, ...diaryDates];

  // Separate Today vs History
  const historyDates = allDiaryDates.filter(d => d !== todayStr);

  const formatDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
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
    setContent('');
    setDate(selectedDate); // Default to selected day from sidebar
    setStatus('completed');
    setIsModalOpen(true);
  };

  const openEditModal = (entry: DiaryEntry) => {
    setModalMode('edit');
    setCurrentItemId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setDate(entry.date);
    setStatus(entry.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !date) return;

    if (modalMode === 'create') {
      await onAction('create', {
        title: title.trim(),
        content: content.trim(),
        date,
        status
      });
    } else if (modalMode === 'edit' && currentItemId) {
      await onAction('update', {
        id: currentItemId,
        title: title.trim(),
        content: content.trim(),
        date,
        status
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this diary entry?')) {
      await onAction('delete', { id });
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'in_progress': return 'Draft';
      case 'paused': return 'Suspended';
      case 'completed': return 'Finalized';
      case 'incomplete': return 'Incomplete';
      default: return s;
    }
  };

  const getStatusBadgeClass = (s: string) => {
    return `badge badge-${s}`;
  };

  const renderDiaryCard = (entry: DiaryEntry) => (
    <div key={entry.id} className="glass-panel item-card diary-node-card" style={{ width: '100%', marginBottom: 0 }}>
      {/* Subtle top-right actions shown on card hover */}
      <div className="card-hover-actions">
        <button
          type="button"
          className="card-hover-btn"
          onClick={() => openEditModal(entry)}
          title="Edit Entry"
        >
          <Edit2 size={13} />
        </button>
        <button
          type="button"
          className="card-hover-btn btn-danger"
          onClick={() => handleDelete(entry.id)}
          title="Delete Entry"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="diary-node-header" style={{ paddingRight: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="diary-node-date">
            {new Date(entry.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <span className={getStatusBadgeClass(entry.status)}>
            {getStatusLabel(entry.status)}
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '0.5rem' }}>{entry.title}</h3>
      
      <p className="item-description" style={{ borderTop: 'none', padding: '0.5rem 0 1rem 0', color: 'var(--text-primary)' }}>
        {entry.content}
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-dark)' }}>
        <span>Logged at {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="view-header">
        <div>
          <h1 className="view-title">Diary & Journal Logs</h1>
          <p className="view-subtitle">Document your thoughts, daily learnings, and retrospective notes in complete privacy.</p>
        </div>
        <button 
          id="add-diary-btn"
          className="btn" 
          style={{ width: 'auto' }} 
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span>Write Entry</span>
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

        {/* Search and Filter controls */}
        <div className="list-controls" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
            <div className="search-input-wrapper" style={{ maxWidth: '320px', flex: 1 }}>
              <Search size={18} />
              <input
                id="diary-search-input"
                type="text"
                className="form-input"
                placeholder="Search by title, contents, or date (YYYY-MM-DD)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                id="diary-filter-status"
                className="form-input"
                style={{ width: '150px', height: '42px', padding: '0 0.75rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="completed">Finalized</option>
                <option value="in_progress">Draft</option>
                <option value="paused">On Hold</option>
                <option value="incomplete">Incomplete</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date:</span>
                <input
                  id="diary-filter-date"
                  type="date"
                  className="form-input"
                  style={{ width: '160px', height: '42px', padding: '0 0.75rem' }}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              {(statusFilter || dateFilter || searchQuery) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', height: '42px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setStatusFilter('');
                    setDateFilter('');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Presentation Layout */}
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
                  <span className="day-item-badge">{groupedDiary[todayStr]?.length || 0}</span>
                </button>
              </div>

              {historyDates.length > 0 && (
                <>
                  <span className="history-section-header">History</span>
                  <div className="days-sidebar-list">
                    {historyDates.map((dateStr) => {
                      const count = groupedDiary[dateStr]?.length || 0;
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

            {/* Right content detailing diary logs for selected day */}
            <div className="days-content">
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Entries for: {formatDate(selectedDate)}
                </span>
                <button
                  className="btn btn-sm"
                  style={{ width: 'auto', padding: '0.4rem 1rem' }}
                  onClick={openCreateModal}
                >
                  <Plus size={14} />
                  <span>Write Entry</span>
                </button>
              </div>

              {(!groupedDiary[selectedDate] || groupedDiary[selectedDate].length === 0) ? (
                <div className="glass-panel empty-state">
                  <Heart size={48} />
                  <div className="empty-state-title">No diary logs for this day</div>
                  <p>
                    {searchQuery 
                      ? 'Try searching with other keywords.' 
                      : `You haven't written any diary logs for this day. Press 'Write Entry' to begin.`}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {groupedDiary[selectedDate].map((entry) => renderDiaryCard(entry))}
                </div>
              )}
            </div>
          </div>
        ) : (
          filteredDiary.length === 0 ? (
            <div className="glass-panel empty-state">
              <Heart size={48} />
              <div className="empty-state-title">No diary entries found</div>
              <p>
                {searchQuery 
                  ? 'Try looking for other dates or keywords.' 
                  : 'Your journal is empty. Click Write Entry to record your first log.'}
              </p>
            </div>
          ) : (
            <div className="diary-timeline">
              {filteredDiary.map((entry) => (
                <div key={entry.id} className={`diary-node ${entry.status}`}>
                  {renderDiaryCard(entry)}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Write / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'create' ? 'Write Diary Entry' : 'Edit Diary Entry'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="diary-form-date">Entry Date</label>
                <input
                  id="diary-form-date"
                  type="date"
                  className="form-input"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="diary-form-title">Title</label>
                <input
                  id="diary-form-title"
                  type="text"
                  className="form-input"
                  placeholder="E.g., Reflecting on communication progress"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="diary-form-content">Content / Journal Details</label>
                <textarea
                  id="diary-form-content"
                  className="form-input"
                  style={{ minHeight: '180px', resize: 'vertical' }}
                  placeholder="Dear diary, today I learned..."
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="diary-form-status">Status</label>
                <select
                  id="diary-form-status"
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="completed">Finalized (Complete)</option>
                  <option value="in_progress">Draft (In Progress)</option>
                  <option value="paused">On Hold (Paused)</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  id="diary-form-cancel"
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="diary-form-submit"
                  type="submit"
                  className="btn"
                  style={{ width: 'auto' }}
                >
                  {modalMode === 'create' ? 'Save Entry' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
