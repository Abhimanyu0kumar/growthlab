'use client';

import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, Smile, Clock, Check } from 'lucide-react';
import { PersonalityItem } from '@/lib/db';

interface PersonalityProps {
  personality: PersonalityItem[];
  onAction: (action: 'create' | 'update' | 'delete', item: any) => Promise<void>;
}

type PersonalityType = 'habits' | 'body_language' | 'communication' | 'clothing' | 'fitness';

export default function Personality({ personality = [], onAction }: PersonalityProps) {
  const [activeSubTab, setActiveSubTab] = useState<PersonalityType>('habits');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // View Modes: standard tab grid vs daily sidebar breakdown
  const [viewMode, setViewMode] = useState<'standard' | 'days'>('days');
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Form State
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'in_progress' | 'paused' | 'completed' | 'incomplete'>('in_progress');
  const [color, setColor] = useState<'green' | 'red'>('green');
  const [createdAtDate, setCreatedAtDate] = useState<string>(todayStr);

  // Filter personality items
  const filteredItems = personality.filter(p => {
    const matchesTab = p.type === activeSubTab;
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    const matchesDate = dateFilter ? p.createdAt.split('T')[0] === dateFilter : true;
    return matchesTab && matchesSearch && matchesStatus && matchesDate;
  });

  // Group items by creation date
  const groupedItems = filteredItems.reduce((acc, item) => {
    const dateKey = item.createdAt.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, PersonalityItem[]>);

  // Sort dates descending
  const itemDates = Object.keys(groupedItems).sort((a, b) => b.localeCompare(a));
  
  // Ensure "Today" is always present in day list
  const allItemDates = itemDates.includes(todayStr) 
    ? itemDates 
    : [todayStr, ...itemDates];

  // Separate Today vs History
  const historyDates = allItemDates.filter(d => d !== todayStr);

  const getSubTabLabel = (type: PersonalityType) => {
    switch (type) {
      case 'habits': return 'Habits';
      case 'body_language': return 'Body Language';
      case 'communication': return 'Communication';
      case 'clothing': return 'Clothing';
      case 'fitness': return 'Fitness';
      default: return type;
    }
  };

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
    setDescription('');
    setStatus('in_progress');
    setColor('green');
    setCreatedAtDate(selectedDate);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PersonalityItem) => {
    setModalMode('edit');
    setCurrentItemId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setStatus(item.status);
    setColor(item.color || 'green');
    setCreatedAtDate(item.createdAt.split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalCreatedAt: string | undefined;
    if (createdAtDate) {
      const originalItem = personality.find(t => t.id === currentItemId);
      if (originalItem && originalItem.createdAt.startsWith(createdAtDate)) {
        finalCreatedAt = originalItem.createdAt;
      } else {
        finalCreatedAt = new Date(`${createdAtDate}T12:00:00`).toISOString();
      }
    }

    if (modalMode === 'create') {
      await onAction('create', {
        type: activeSubTab,
        title: title.trim(),
        description: description.trim(),
        status,
        color,
        createdAt: finalCreatedAt
      });
    } else if (modalMode === 'edit' && currentItemId) {
      await onAction('update', {
        id: currentItemId,
        type: activeSubTab,
        title: title.trim(),
        description: description.trim(),
        status,
        color,
        createdAt: finalCreatedAt
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this personality trait/item?')) {
      await onAction('delete', { id });
    }
  };

  const handleQuickComplete = async (item: PersonalityItem) => {
    const nextStatus = item.status === 'completed' ? 'in_progress' : 'completed';
    await onAction('update', {
      ...item,
      status: nextStatus
    });
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'in_progress': return 'In Progress';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'incomplete': return 'Incomplete';
      default: return s;
    }
  };

  const getStatusBadgeClass = (s: string) => {
    return `badge badge-${s}`;
  };

  const renderItemCard = (item: PersonalityItem) => {
    const isCompleted = item.status === 'completed';
    const isBad = item.color === 'red';
    return (
      <div key={item.id} className={`glass-panel item-card ${isBad ? 'card-border-bad' : 'card-border-good'}`}>
        {/* Subtle top-right actions shown on card hover */}
        <div className="card-hover-actions">
          <button
            type="button"
            className="card-hover-btn"
            onClick={() => openEditModal(item)}
            title="Edit Item"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="card-hover-btn btn-danger"
            onClick={() => handleDelete(item.id)}
            title="Delete Item"
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
              onClick={() => handleQuickComplete(item)}
              title={isCompleted ? 'Mark Active' : 'Mark Mastered'}
            >
              {isCompleted && <Check size={11} style={{ color: '#ffffff' }} />}
            </button>
          </div>
          <span className={`item-title ${isCompleted ? 'completed' : ''}`}>
            {item.title}
          </span>
          <span className={`badge ${isBad ? 'badge-bad' : 'badge-good'}`} style={{ flexShrink: 0, marginRight: '0.5rem' }}>
            {isBad ? 'To Leave' : 'To Flow'}
          </span>
          <span className={getStatusBadgeClass(item.status)} style={{ flexShrink: 0 }}>
            {getStatusLabel(item.status)}
          </span>
        </div>

        <p className="item-description">{item.description || 'No notes or guidelines provided.'}</p>

        <div className="item-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={11} />
            <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={11} />
            <span>Focus: {getSubTabLabel(item.type)}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="view-header">
        <div>
          <h1 className="view-title">Personality Development</h1>
          <p className="view-subtitle">Cultivate habits, improve body language, polish communication, style your clothing, and track fitness targets.</p>
        </div>
        <button 
          id="add-personality-btn"
          className="btn" 
          style={{ width: 'auto' }} 
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span>Add Practice / Trait</span>
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

        {/* Sub Navigation Tabs */}
        <div className="tabs-nav">
          {(['habits', 'body_language', 'communication', 'clothing', 'fitness'] as PersonalityType[]).map((tab) => (
            <button
              key={tab}
              id={`personality-subtab-${tab}`}
              className={`tab-nav-btn ${activeSubTab === tab ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {getSubTabLabel(tab)}
            </button>
          ))}
        </div>

        {/* Search and Filter controls */}
        <div className="list-controls" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
            <div className="search-input-wrapper" style={{ maxWidth: '320px', flex: 1 }}>
              <Search size={18} />
              <input
                id="personality-search-input"
                type="text"
                className="form-input"
                placeholder={`Search in ${getSubTabLabel(activeSubTab)}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                id="personality-filter-status"
                className="form-input"
                style={{ width: '150px', height: '42px', padding: '0 0.75rem' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date:</span>
                <input
                  id="personality-filter-date"
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

        {/* Personality List Presentation */}
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
                  <span className="day-item-badge">{groupedItems[todayStr]?.length || 0}</span>
                </button>
              </div>

              {historyDates.length > 0 && (
                <>
                  <span className="history-section-header">History</span>
                  <div className="days-sidebar-list">
                    {historyDates.map((dateStr) => {
                      const count = groupedItems[dateStr]?.length || 0;
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

            {/* Right content detailing traits/habits for selected day */}
            <div className="days-content">
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Practices for: {formatDate(selectedDate)}
                </span>
                <button
                  className="btn btn-sm"
                  style={{ width: 'auto', padding: '0.4rem 1rem' }}
                  onClick={openCreateModal}
                >
                  <Plus size={14} />
                  <span>Add Practice</span>
                </button>
              </div>

              {(!groupedItems[selectedDate] || groupedItems[selectedDate].length === 0) ? (
                <div className="glass-panel empty-state">
                  <Smile size={48} />
                  <div className="empty-state-title">No items for this day</div>
                  <p>
                    {searchQuery 
                      ? 'Try adjusting your search query.' 
                      : `You haven't added any entries in ${getSubTabLabel(activeSubTab)} for this day. Press 'Add Practice' to begin.`}
                  </p>
                </div>
              ) : (
                <div className="items-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {groupedItems[selectedDate].map((item) => renderItemCard(item))}
                </div>
              )}
            </div>
          </div>
        ) : (
          filteredItems.length === 0 ? (
            <div className="glass-panel empty-state">
              <Smile size={48} />
              <div className="empty-state-title">No items found</div>
              <p>
                {searchQuery 
                  ? 'Try adjusting your search query.' 
                  : `You haven't added any entries in ${getSubTabLabel(activeSubTab)} yet. Add one to start tracking your development.`}
              </p>
            </div>
          ) : (
            <div className="items-grid">
              {filteredItems.map((item) => renderItemCard(item))}
            </div>
          )
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'create' ? `Add ${getSubTabLabel(activeSubTab)} Trait/Habit` : 'Edit Item'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="personality-form-title">Focused Trait / Habit</label>
                <input
                  id="personality-form-title"
                  type="text"
                  className="form-input"
                  placeholder="E.g., Eye contact while listening, Stand tall, 10k steps daily"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="personality-form-desc">Actionable Guidelines & Notes</label>
                <textarea
                  id="personality-form-desc"
                  className="form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="What are the specific exercises, triggers, or clothing rules to implement?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="personality-form-color">Type / Sentiment</label>
                <select
                  id="personality-form-color"
                  className="form-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value as any)}
                >
                  <option value="green">Good / To Flow (Green)</option>
                  <option value="red">Bad / To Avoid/Leave (Red)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="personality-form-status">Status</label>
                <select
                  id="personality-form-status"
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="in_progress">In Progress</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  id="personality-form-cancel"
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="personality-form-submit"
                  type="submit"
                  className="btn"
                  style={{ width: 'auto' }}
                >
                  {modalMode === 'create' ? 'Create Practice' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
