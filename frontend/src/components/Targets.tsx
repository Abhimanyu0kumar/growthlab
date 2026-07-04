'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, CheckSquare, Clock, Check } from 'lucide-react';
import { Target } from '@/lib/db';

interface TargetsProps {
  targets: Target[];
  onAction: (action: 'create' | 'update' | 'delete', item: any) => Promise<void>;
}

type TargetType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function Targets({ targets = [], onAction }: TargetsProps) {
  const [activeSubTab, setActiveSubTab] = useState<TargetType>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // View Modes: standard tab grid vs daily sidebar breakdown
  const [viewMode, setViewMode] = useState<'standard' | 'days'>('days');
  const todayStr = new Date().toISOString().split('T')[0];

  const getStartOfWeek = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const getCurrentKey = () => {
    if (activeSubTab === 'weekly') {
      return getStartOfWeek(todayStr);
    }
    if (activeSubTab === 'monthly') {
      return todayStr.substring(0, 7) + '-01';
    }
    if (activeSubTab === 'yearly') {
      return todayStr.substring(0, 4) + '-01-01';
    }
    return todayStr; // daily
  };

  const [selectedDate, setSelectedDate] = useState<string>(getCurrentKey());

  // Form State
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'in_progress' | 'paused' | 'completed' | 'incomplete'>('in_progress');
  const [createdAtDate, setCreatedAtDate] = useState<string>(todayStr);

  // Sync selected date when sub-tab changes
  useEffect(() => {
    const newKey = getCurrentKey();
    setSelectedDate(newKey);
    setCreatedAtDate(newKey);
  }, [activeSubTab]);

  // Filter targets based on current active sub-tab, search, status, and date
  const filteredTargets = targets.filter(t => {
    const matchesTab = t.type === activeSubTab;
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? t.status === statusFilter : true;
    const matchesDate = dateFilter ? t.createdAt.split('T')[0] === dateFilter : true;
    return matchesTab && matchesSearch && matchesStatus && matchesDate;
  });

  const getGroupKey = (createdAtStr: string) => {
    const dateStr = createdAtStr.split('T')[0];
    if (activeSubTab === 'weekly') {
      return getStartOfWeek(dateStr);
    }
    if (activeSubTab === 'monthly') {
      return dateStr.substring(0, 7) + '-01';
    }
    if (activeSubTab === 'yearly') {
      return dateStr.substring(0, 4) + '-01-01';
    }
    return dateStr; // daily
  };

  // Group targets by calculation key
  const groupedTargets = filteredTargets.reduce((acc, target) => {
    const dateKey = getGroupKey(target.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(target);
    return acc;
  }, {} as Record<string, Target[]>);

  const currentKey = getCurrentKey();

  // Sort dates descending
  const targetDates = Object.keys(groupedTargets).sort((a, b) => b.localeCompare(a));
  
  // Ensure the current active key is always present in day list
  const allTargetDates = targetDates.includes(currentKey) 
    ? targetDates 
    : [currentKey, ...targetDates];

  // Separate Today/This Week/etc vs History
  const historyDates = allTargetDates.filter(d => d !== currentKey);

  const formatKeyLabel = (keyStr: string) => {
    if (keyStr === currentKey) {
      if (activeSubTab === 'weekly') return 'This Week';
      if (activeSubTab === 'monthly') return 'This Month';
      if (activeSubTab === 'yearly') return 'This Year';
      return 'Today';
    }

    if (activeSubTab === 'weekly') {
      const lastWeekKey = getStartOfWeek(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
      if (keyStr === lastWeekKey) return 'Last Week';
      
      const date = new Date(keyStr + 'T00:00:00');
      return 'Week of ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (activeSubTab === 'monthly') {
      const date = new Date(keyStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    if (activeSubTab === 'yearly') {
      return keyStr.substring(0, 4);
    }

    // Daily
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (keyStr === yesterday) return 'Yesterday';
    
    const date = new Date(keyStr + 'T00:00:00');
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
    // Lock daily targets to Today's date, otherwise default to selectedDate
    setCreatedAtDate(activeSubTab === 'daily' ? todayStr : selectedDate);
    setIsModalOpen(true);
  };

  const openEditModal = (target: Target) => {
    setModalMode('edit');
    setCurrentItemId(target.id);
    setTitle(target.title);
    setDescription(target.description);
    setStatus(target.status);
    setCreatedAtDate(target.createdAt.split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalCreatedAt: string | undefined;
    if (createdAtDate) {
      const originalItem = targets.find(t => t.id === currentItemId);
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
        createdAt: finalCreatedAt
      });
    } else if (modalMode === 'edit' && currentItemId) {
      await onAction('update', {
        id: currentItemId,
        type: activeSubTab,
        title: title.trim(),
        description: description.trim(),
        status,
        createdAt: finalCreatedAt
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this target?')) {
      await onAction('delete', { id });
    }
  };

  const handleQuickComplete = async (target: Target) => {
    const nextStatus = target.status === 'completed' ? 'in_progress' : 'completed';
    await onAction('update', {
      ...target,
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

  const renderTargetCard = (target: Target) => {
    const isCompleted = target.status === 'completed';
    return (
      <div key={target.id} className="glass-panel item-card">
        {/* Subtle top-right actions shown on card hover */}
        <div className="card-hover-actions">
          <button
            type="button"
            className="card-hover-btn"
            onClick={() => openEditModal(target)}
            title="Edit Target"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="card-hover-btn btn-danger"
            onClick={() => handleDelete(target.id)}
            title="Delete Target"
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
              onClick={() => handleQuickComplete(target)}
              title={isCompleted ? 'Mark as In Progress' : 'Mark Completed'}
            >
              {isCompleted && <Check size={11} style={{ color: '#ffffff' }} />}
            </button>
          </div>
          <span className={`item-title ${isCompleted ? 'completed' : ''}`}>
            {target.title}
          </span>
          <span className={getStatusBadgeClass(target.status)} style={{ flexShrink: 0 }}>
            {getStatusLabel(target.status)}
          </span>
        </div>

        <p className="item-description">{target.description || 'No description provided.'}</p>

        <div className="item-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={11} />
            <span>Created: {new Date(target.createdAt).toLocaleDateString()}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={11} />
            <span>Type: {target.type}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="view-header">
        <div>
          <h1 className="view-title">Targets / Goals</h1>
          <p className="view-subtitle">Manage your personal and professional targets across daily, weekly, monthly, and yearly intervals.</p>
        </div>
        <button 
          id="add-target-btn"
          className="btn" 
          style={{ width: 'auto' }} 
          onClick={openCreateModal}
        >
          <Plus size={18} />
          <span>Add Target</span>
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
            📅 Group by Time
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
          {(['daily', 'weekly', 'monthly', 'yearly'] as TargetType[]).map((tab) => (
            <button
              key={tab}
              id={`target-subtab-${tab}`}
              className={`tab-nav-btn ${activeSubTab === tab ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Targets
            </button>
          ))}
        </div>

        {/* Search and Filter controls */}
        <div className="list-controls" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
            <div className="search-input-wrapper" style={{ maxWidth: '320px', flex: 1 }}>
              <Search size={18} />
              <input
                id="target-search-input"
                type="text"
                className="form-input"
                placeholder="Search targets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                id="target-filter-status"
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
                  id="target-filter-date"
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

        {/* Targets List Presentation */}
        {viewMode === 'days' ? (
          <div className="days-layout">
            {/* Left sidebar list of periods */}
            <div className="days-sidebar glass-panel">
              <span className="days-sidebar-title">
                {activeSubTab === 'daily' ? 'Today' : activeSubTab === 'weekly' ? 'This Week' : activeSubTab === 'monthly' ? 'This Month' : 'This Year'}
              </span>
              <div className="days-sidebar-list">
                <button
                  type="button"
                  onClick={() => setSelectedDate(currentKey)}
                  className={`day-item-btn ${selectedDate === currentKey ? 'active' : ''}`}
                >
                  <div className="day-item-date">{formatKeyLabel(currentKey)}</div>
                  <span className="day-item-badge">{groupedTargets[currentKey]?.length || 0}</span>
                </button>
              </div>

              {historyDates.length > 0 && (
                <>
                  <span className="history-section-header">History</span>
                  <div className="days-sidebar-list">
                    {historyDates.map((dateStr) => {
                      const count = groupedTargets[dateStr]?.length || 0;
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => setSelectedDate(dateStr)}
                          className={`day-item-btn ${selectedDate === dateStr ? 'active' : ''}`}
                        >
                          <div className="day-item-date">{formatKeyLabel(dateStr)}</div>
                          <span className="day-item-badge">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Right content detailing tasks for selected period */}
            <div className="days-content">
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Tasks for: {formatKeyLabel(selectedDate)}
                </span>
                <button
                  className="btn btn-sm"
                  style={{ width: 'auto', padding: '0.4rem 1rem' }}
                  onClick={openCreateModal}
                >
                  <Plus size={14} />
                  <span>Add Target</span>
                </button>
              </div>

              {(!groupedTargets[selectedDate] || groupedTargets[selectedDate].length === 0) ? (
                <div className="glass-panel empty-state">
                  <CheckSquare size={48} />
                  <div className="empty-state-title">No targets for this period</div>
                  <p>
                    {searchQuery 
                      ? 'Try adjusting your search keywords.' 
                      : `You don't have any ${activeSubTab} targets configured for this period. Press 'Add Target' to begin.`}
                  </p>
                </div>
              ) : (
                <div className="items-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {groupedTargets[selectedDate].map((target) => renderTargetCard(target))}
                </div>
              )}
            </div>
          </div>
        ) : (
          filteredTargets.length === 0 ? (
            <div className="glass-panel empty-state">
              <CheckSquare size={48} />
              <div className="empty-state-title">No targets found</div>
              <p>
                {searchQuery 
                  ? 'Try adjusting your search keywords.' 
                  : `You don't have any ${activeSubTab} targets configured yet. Press 'Add Target' to begin.`}
              </p>
            </div>
          ) : (
            <div className="items-grid">
              {filteredTargets.map((target) => renderTargetCard(target))}
            </div>
          )
        )}
      </div>

      {/* Target Create/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'create' ? `Add New ${activeSubTab.charAt(0).toUpperCase() + activeSubTab.slice(1)} Target` : 'Edit Target'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="target-form-title">Title</label>
                <input
                  id="target-form-title"
                  type="text"
                  className="form-input"
                  placeholder="E.g., Complete backend crypto refactor"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="target-form-date">Target Date</label>
                <input
                  id="target-form-date"
                  type="date"
                  className="form-input"
                  required
                  disabled={activeSubTab === 'daily'}
                  value={createdAtDate}
                  onChange={(e) => setCreatedAtDate(e.target.value)}
                />
                {activeSubTab === 'daily' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '0.25rem', display: 'block' }}>
                    Daily targets are locked to Today and cannot be backdated or rescheduled.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="target-form-desc">Description</label>
                <textarea
                  id="target-form-desc"
                  className="form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Detailed notes on what counts as success..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="target-form-status">Status</label>
                <select
                  id="target-form-status"
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
                  id="target-form-cancel"
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  id="target-form-submit"
                  type="submit"
                  className="btn"
                  style={{ width: 'auto' }}
                >
                  {modalMode === 'create' ? 'Create Target' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
