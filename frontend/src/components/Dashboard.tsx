'use client';

import React, { useState } from 'react';
import { Target, Sparkles, BookOpen, BookText, Clock, Play } from 'lucide-react';
import { Target as DbTarget, PersonalityItem, Book, DiaryEntry } from '@/lib/db';

interface DashboardProps {
  targets: DbTarget[];
  personality: PersonalityItem[];
  books: Book[];
  diary: DiaryEntry[];
  setActiveTab: (tab: string) => void;
  showPasswordWarning: boolean;
  onAction: (action: 'create' | 'update' | 'delete', item: any, targetCollection?: string) => Promise<void>;
}

export default function Dashboard({
  targets = [],
  personality = [],
  books = [],
  diary = [],
  setActiveTab,
  showPasswordWarning,
  onAction
}: DashboardProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; visible: boolean }>({
    x: 0,
    y: 0,
    text: '',
    visible: false
  });

  const [isRunningModalOpen, setIsRunningModalOpen] = useState(false);
  const [graphPeriod, setGraphPeriod] = useState<'weekly' | 'monthly' | 'yearly' | 'overall'>('weekly');

  // 1. Calculate Stats
  const totalTargets = targets.length;
  const completedTargets = targets.filter(t => t.status === 'completed').length;
  const targetRate = totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;

  const totalPersonality = personality.length;
  const completedPersonality = personality.filter(p => p.status === 'completed').length;
  const personalityRate = totalPersonality > 0 ? Math.round((completedPersonality / totalPersonality) * 100) : 0;

  const totalBooks = books.length;
  const completedBooks = books.filter(b => b.status === 'completed').length; // read
  const booksRate = totalBooks > 0 ? Math.round((completedBooks / totalBooks) * 100) : 0;

  const totalDiary = diary.length;
  const completedDiary = diary.filter(d => d.status === 'completed').length;
  const diaryRate = totalDiary > 0 ? Math.round((completedDiary / totalDiary) * 100) : 0;

  // Running items calculation
  const inProgressTargets = targets.filter(t => t.status === 'in_progress');
  const inProgressPersonality = personality.filter(p => p.status === 'in_progress');
  const inProgressBooks = books.filter(b => b.status === 'in_progress');
  const inProgressDiary = diary.filter(d => d.status === 'in_progress');
  const totalRunningCount = inProgressTargets.length + inProgressPersonality.length + inProgressBooks.length + inProgressDiary.length;

  // Overall growth indicator: average of the rates
  const activeCategoriesCount = [totalTargets > 0, totalPersonality > 0, totalBooks > 0].filter(Boolean).length;
  const overallRate = activeCategoriesCount > 0
    ? Math.round((targetRate + personalityRate + booksRate) / activeCategoriesCount)
    : 0;

  // Helper to calculate stats up to a given date
  const calculateStatsForDate = (dateStr: string, displayStr: string) => {
    const targetsUpToDate = targets.filter(t => t.createdAt.split('T')[0] <= dateStr);
    const targetsCompletedUpToDate = targets.filter(t => t.createdAt.split('T')[0] <= dateStr && t.status === 'completed' && t.updatedAt.split('T')[0] <= dateStr);
    const tRate = targetsUpToDate.length > 0 ? (targetsCompletedUpToDate.length / targetsUpToDate.length) : 0;

    const personalityUpToDate = personality.filter(p => p.createdAt.split('T')[0] <= dateStr);
    const personalityCompletedUpToDate = personality.filter(p => p.createdAt.split('T')[0] <= dateStr && p.status === 'completed' && p.updatedAt.split('T')[0] <= dateStr);
    const pRate = personalityUpToDate.length > 0 ? (personalityCompletedUpToDate.length / personalityUpToDate.length) : 0;

    const booksUpToDate = books.filter(b => b.createdAt.split('T')[0] <= dateStr);
    const booksCompletedUpToDate = books.filter(b => b.createdAt.split('T')[0] <= dateStr && b.status === 'completed' && b.updatedAt.split('T')[0] <= dateStr);
    const bRate = booksUpToDate.length > 0 ? (booksCompletedUpToDate.length / booksUpToDate.length) : 0;

    const denominator = [targetsUpToDate.length > 0, personalityUpToDate.length > 0, booksUpToDate.length > 0].filter(Boolean).length;
    const combinedRate = denominator > 0 ? Math.round(((tRate + pRate + bRate) / denominator) * 100) : 0;

    return {
      label: displayStr,
      rawDate: dateStr,
      value: combinedRate,
      targets: targetsUpToDate.length > 0 ? Math.round(tRate * 100) : 0,
      personality: personalityUpToDate.length > 0 ? Math.round(pRate * 100) : 0,
      books: booksUpToDate.length > 0 ? Math.round(bRate * 100) : 0,
      diary: diary.filter(d => d.date <= dateStr).length
    };
  };

  // 2. Generate historical progress based on selected period
  const getGrowthData = () => {
    const dataPoints = [];
    const now = new Date();

    if (graphPeriod === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const displayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        dataPoints.push(calculateStatsForDate(dateStr, displayStr));
      }
    } else if (graphPeriod === 'monthly') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        // Display label for every 5th day to avoid crowding
        const displayStr = i % 5 === 0 ? date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : '';
        dataPoints.push(calculateStatsForDate(dateStr, displayStr));
      }
    } else if (graphPeriod === 'yearly') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(now.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const displayStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        dataPoints.push(calculateStatsForDate(dateStr, displayStr));
      }
    } else { // overall
      const allDates = [...targets, ...personality, ...books].map(x => x.createdAt ? x.createdAt.split('T')[0] : '').filter(Boolean).sort();
      const earliestDateStr = allDates[0] || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const start = new Date(earliestDateStr + 'T00:00:00');
      const end = new Date(now.toISOString().split('T')[0] + 'T23:59:59');
      const totalDays = Math.max(Math.ceil((end.getTime() - start.getTime()) / 86400000), 1);
      
      const numPoints = 8;
      for (let i = 0; i < numPoints; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + Math.round((i / (numPoints - 1)) * totalDays));
        const dateStr = date.toISOString().split('T')[0];
        const displayStr = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        dataPoints.push(calculateStatsForDate(dateStr, displayStr));
      }
    }
    return dataPoints;
  };

  const growthData = getGrowthData();

  // 3. Custom SVG Math for overall chart
  const width = 800;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = growthData.map((d, index) => {
    const x = paddingLeft + (index / (growthData.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.value / 100) * chartHeight;
    return { x, y, data: d };
  });

  const linePath = points.length > 0
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  // 4. Sub-tab progress breakdowns (Individual growth)
  // Targets sub-tab completion
  const dailyTargets = targets.filter(t => t.type === 'daily');
  const weeklyTargets = targets.filter(t => t.type === 'weekly');
  const monthlyTargets = targets.filter(t => t.type === 'monthly');
  const yearlyTargets = targets.filter(t => t.type === 'yearly');

  const getSubRate = (list: any[]) => list.length > 0 ? Math.round((list.filter(x => x.status === 'completed').length / list.length) * 100) : 0;

  const targetSubStats = [
    { name: 'Daily', rate: getSubRate(dailyTargets), total: dailyTargets.length },
    { name: 'Weekly', rate: getSubRate(weeklyTargets), total: weeklyTargets.length },
    { name: 'Monthly', rate: getSubRate(monthlyTargets), total: monthlyTargets.length },
    { name: 'Yearly', rate: getSubRate(yearlyTargets), total: yearlyTargets.length },
  ];

  // Personality sub-tab completion
  const habitsItems = personality.filter(p => p.type === 'habits');
  const bodyItems = personality.filter(p => p.type === 'body_language');
  const commsItems = personality.filter(p => p.type === 'communication');
  const clothingItems = personality.filter(p => p.type === 'clothing');
  const fitnessItems = personality.filter(p => p.type === 'fitness');

  const personalitySubStats = [
    { name: 'Habits', rate: getSubRate(habitsItems), total: habitsItems.length },
    { name: 'Body Lang.', rate: getSubRate(bodyItems), total: bodyItems.length },
    { name: 'Comms', rate: getSubRate(commsItems), total: commsItems.length },
    { name: 'Clothing', rate: getSubRate(clothingItems), total: clothingItems.length },
    { name: 'Fitness', rate: getSubRate(fitnessItems), total: fitnessItems.length },
  ];

  // Books categories completion
  const bookCategories = Array.from(new Set(books.map(b => b.category || 'General')));
  const bookCategoryStats = bookCategories.map(cat => {
    const catBooks = books.filter(b => (b.category || 'General') === cat);
    return {
      name: cat,
      rate: getSubRate(catBooks),
      total: catBooks.length
    };
  }).slice(0, 4); // Limit to top 4 categories for UI cleanliness

  // Handle Chart Hover Tooltip
  const handleMouseMove = (e: React.MouseEvent, text: string, x: number, y: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: x + 10,
      y: y - 35,
      text,
      visible: true
    });
  };

  return (
    <>
      <div className="view-header">
        <div>
          <h1 className="view-title">Growth Dashboard</h1>
          <p className="view-subtitle">An overview of your encrypted target achievements, habits, and readings.</p>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="dashboard-grid">
        <div className="glass-panel dashboard-card-stat" onClick={() => setIsRunningModalOpen(true)} style={{ cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label" style={{ color: '#a5b4fc' }}>Active Focus / Running</div>
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}><Clock size={20} /></div>
          </div>
          <div className="stat-value" style={{ color: '#818cf8', fontSize: '1.5rem' }}>
            {totalRunningCount <= 1 ? `${totalRunningCount} Focus` : `${totalRunningCount} Foci`}
          </div>
          <div className="stat-trend" style={{ color: '#a5b4fc' }}>
            {totalRunningCount === 0 ? 'All caught up! Time to grow! ✨' : 'Click to view all in-progress'}
          </div>
        </div>

        <div className="glass-panel dashboard-card-stat" onClick={() => setActiveTab('targets')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Targets</div>
            <div className="stat-icon"><Target size={20} /></div>
          </div>
          <div className="stat-value">{completedTargets}/{totalTargets}</div>
          <div className="stat-trend" style={{ color: targetRate > 50 ? '#34d399' : '#f87171' }}>
            {targetRate}% Completed
          </div>
        </div>

        <div className="glass-panel dashboard-card-stat" onClick={() => setActiveTab('personality')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Personality</div>
            <div className="stat-icon secondary"><Sparkles size={20} /></div>
          </div>
          <div className="stat-value">{completedPersonality}/{totalPersonality}</div>
          <div className="stat-trend" style={{ color: personalityRate > 50 ? '#34d399' : '#f87171' }}>
            {personalityRate}% Mastery
          </div>
        </div>

        <div className="glass-panel dashboard-card-stat" onClick={() => setActiveTab('books')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Books Read</div>
            <div className="stat-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}><BookOpen size={20} /></div>
          </div>
          <div className="stat-value">{completedBooks}/{totalBooks}</div>
          <div className="stat-trend" style={{ color: booksRate > 50 ? '#34d399' : '#f87171' }}>
            {booksRate}% Read
          </div>
        </div>

        <div className="glass-panel dashboard-card-stat" onClick={() => setActiveTab('diary')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Diary Logs</div>
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}><BookText size={20} /></div>
          </div>
          <div className="stat-value">{totalDiary}</div>
          <div className="stat-trend" style={{ color: '#10b981' }}>
            {diary.filter(d => d.status === 'completed').length} finalized logs
          </div>
        </div>
      </div>

      {/* Main Growth Graph */}
      <div className="glass-panel" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Overall Growth Progress (%)</h2>
          <div className="view-mode-selector" style={{ margin: 0 }}>
            {(['weekly', 'monthly', 'yearly', 'overall'] as const).map((period) => (
              <button
                key={period}
                type="button"
                className={`view-mode-btn ${graphPeriod === period ? 'active' : ''}`}
                onClick={() => setGraphPeriod(period)}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {totalTargets === 0 && totalPersonality === 0 && totalBooks === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} />
            <div className="empty-state-title">No growth history yet</div>
            <p>Once you start adding and completing targets, habits, or books, your overall growth progress chart will generate here.</p>
          </div>
        ) : (
          <div className="graph-container">
            <div className="graph-svg-wrapper">
              <svg className="svg-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map((val, idx) => {
                  const y = paddingTop + chartHeight - (val / 100) * chartHeight;
                  return (
                    <g key={idx}>
                      <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} className="svg-grid-line" />
                      <text x={paddingLeft - 10} y={y + 3} className="svg-axis-text" textAnchor="end">{val}%</text>
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {growthData.map((d, idx) => {
                  if (!d.label) return null;
                  const x = paddingLeft + (idx / (growthData.length - 1)) * chartWidth;
                  return (
                    <text key={idx} x={x} y={height - 5} className="svg-axis-text" textAnchor="middle">
                      {d.label}
                    </text>
                  );
                })}

                {/* Area Under Line */}
                {points.length > 0 && (
                  <path d={areaPath} className="svg-area-path" />
                )}

                {/* Line Path */}
                {points.length > 0 && (
                  <path d={linePath} className="svg-line-path" />
                )}

                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    className="svg-chart-point"
                    onMouseEnter={(e) => {
                      const text = `Overall: ${p.data.value}% | Targets: ${p.data.targets}% | Habits: ${p.data.personality}% | Books: ${p.data.books}%`;
                      handleMouseMove(e, text, p.x, p.y);
                    }}
                    onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                  />
                ))}
              </svg>

              {/* Tooltip */}
              {tooltip.visible && (
                <div
                  className="chart-tooltip"
                  style={{
                    display: 'block',
                    left: `${tooltip.x}px`,
                    top: `${tooltip.y}px`
                  }}
                >
                  {tooltip.text}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Individual Growth breakdown cards */}
      <div className="graphs-row">
        {/* Targets and Personality bar charts */}
        <div className="glass-panel">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 700 }}>Individual Progress by Section</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Targets Subcategories */}
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Targets Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {targetSubStats.map((stat, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.name}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.25rem 0' }}>{stat.rate}%</div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${stat.rate}%`, height: '100%', background: 'var(--accent-primary)' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>{stat.total} total items</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personality Subcategories */}
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personality Habits Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                {personalitySubStats.map((stat, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.name}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.25rem 0' }}>{stat.rate}%</div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${stat.rate}%`, height: '100%', background: 'var(--accent-secondary)' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>{stat.total} items</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Books and Diary stats card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700 }}>Reading & Journals</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {/* Top Book Categories */}
            <div>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Books by Category</h3>
              {bookCategoryStats.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', padding: '0.5rem 0' }}>No categories available</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {bookCategoryStats.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{cat.rate}% ({cat.total} books)</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${cat.rate}%`, height: '100%', background: '#ec4899' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diary Journal entries count last 7 days */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diary Logging Activity</h3>
              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'space-between', alignItems: 'flex-end', height: '40px' }}>
                {growthData.map((day, idx) => {
                  const maxLogs = Math.max(...growthData.map(d => d.diary), 1);
                  const barHeight = Math.max((day.diary / maxLogs) * 100, 10);
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: `${barHeight}%`,
                        background: day.diary > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                      title={`${day.diary} diary entries up to ${day.label}`}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.35rem' }}>
                <span>{growthData[0]?.label}</span>
                <span>{growthData[growthData.length - 1]?.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isRunningModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRunningModalOpen(false)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={22} style={{ color: 'var(--accent-primary)' }} />
                <span>Active Focus & Running Items</span>
              </h2>
              <button className="modal-close-btn" onClick={() => setIsRunningModalOpen(false)}>
                &times;
              </button>
            </div>

            <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {totalRunningCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  <Play size={36} style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }} />
                  <p style={{ fontWeight: 600 }}>No items currently in progress.</p>
                  <p style={{ fontSize: '0.85rem' }}>Start new targets, read books, or practice habits to track them here!</p>
                </div>
              ) : (
                <>
                  {inProgressTargets.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Targets ({inProgressTargets.length})</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>Click title to view tab</span>
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {inProgressTargets.map(t => (
                          <div
                            key={t.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <span
                              style={{ fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', flex: 1 }}
                              onClick={() => { setIsRunningModalOpen(false); setActiveTab('targets'); }}
                              title="Go to Targets tab"
                            >
                              {t.title} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>({t.type})</span>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                value={t.status}
                                onChange={async (e) => {
                                  await onAction('update', { ...t, status: e.target.value }, 'targets');
                                }}
                                style={{
                                  background: '#1f2937',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  padding: '0.2rem 0.4rem',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="in_progress" style={{ background: '#1f2937', color: '#ffffff' }}>In Progress</option>
                                <option value="paused" style={{ background: '#1f2937', color: '#ffffff' }}>Paused</option>
                                <option value="completed" style={{ background: '#1f2937', color: '#ffffff' }}>Completed</option>
                                <option value="incomplete" style={{ background: '#1f2937', color: '#ffffff' }}>Incomplete</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inProgressPersonality.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Personality & Habits ({inProgressPersonality.length})</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>Click title to view tab</span>
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {inProgressPersonality.map(p => (
                          <div
                            key={p.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <span
                              style={{ fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', flex: 1 }}
                              onClick={() => { setIsRunningModalOpen(false); setActiveTab('personality'); }}
                              title="Go to Personality tab"
                            >
                              {p.title} <span className={`badge ${p.color === 'red' ? 'badge-bad' : 'badge-good'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', marginLeft: '0.5rem' }}>
                                {p.type === 'habits' ? 'Habit' : p.type === 'body_language' ? 'Body Lang.' : p.type === 'communication' ? 'Comms' : p.type === 'clothing' ? 'Clothing' : 'Fitness'}
                              </span>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                value={p.status}
                                onChange={async (e) => {
                                  await onAction('update', { ...p, status: e.target.value }, 'personality');
                                }}
                                style={{
                                  background: '#1f2937',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  padding: '0.2rem 0.4rem',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="in_progress" style={{ background: '#1f2937', color: '#ffffff' }}>In Progress</option>
                                <option value="paused" style={{ background: '#1f2937', color: '#ffffff' }}>Paused</option>
                                <option value="completed" style={{ background: '#1f2937', color: '#ffffff' }}>Completed</option>
                                <option value="incomplete" style={{ background: '#1f2937', color: '#ffffff' }}>Incomplete</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inProgressBooks.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ec4899', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Books In Progress ({inProgressBooks.length})</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>Click title to view tab</span>
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {inProgressBooks.map(b => (
                          <div
                            key={b.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <span
                              style={{ fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', flex: 1 }}
                              onClick={() => { setIsRunningModalOpen(false); setActiveTab('books'); }}
                              title="Go to Books tab"
                            >
                              {b.title} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>by {b.author}</span>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                value={b.status}
                                onChange={async (e) => {
                                  await onAction('update', { ...b, status: e.target.value }, 'books');
                                }}
                                style={{
                                  background: '#1f2937',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  padding: '0.2rem 0.4rem',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="in_progress" style={{ background: '#1f2937', color: '#ffffff' }}>Reading</option>
                                <option value="paused" style={{ background: '#1f2937', color: '#ffffff' }}>Paused</option>
                                <option value="completed" style={{ background: '#1f2937', color: '#ffffff' }}>Completed</option>
                                <option value="incomplete" style={{ background: '#1f2937', color: '#ffffff' }}>Incomplete</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inProgressDiary.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Diary Drafts ({inProgressDiary.length})</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>Click title to view tab</span>
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {inProgressDiary.map(d => (
                          <div
                            key={d.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <span
                              style={{ fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer', flex: 1 }}
                              onClick={() => { setIsRunningModalOpen(false); setActiveTab('diary'); }}
                              title="Go to Diary tab"
                            >
                              {d.title} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>({d.date})</span>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <select
                                value={d.status}
                                onChange={async (e) => {
                                  await onAction('update', { ...d, status: e.target.value }, 'diary');
                                }}
                                style={{
                                  background: '#1f2937',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  padding: '0.2rem 0.4rem',
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="in_progress" style={{ background: '#1f2937', color: '#ffffff' }}>Draft</option>
                                <option value="paused" style={{ background: '#1f2937', color: '#ffffff' }}>Paused</option>
                                <option value="completed" style={{ background: '#1f2937', color: '#ffffff' }}>Finalized</option>
                                <option value="incomplete" style={{ background: '#1f2937', color: '#ffffff' }}>Incomplete</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 'auto' }}
                onClick={() => setIsRunningModalOpen(false)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
