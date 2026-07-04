'use client';

import React, { useState } from 'react';
import { Target, Sparkles, BookOpen, BookText, AlertTriangle } from 'lucide-react';
import { Target as DbTarget, PersonalityItem, Book, DiaryEntry } from '@/lib/db';

interface DashboardProps {
  targets: DbTarget[];
  personality: PersonalityItem[];
  books: Book[];
  diary: DiaryEntry[];
  setActiveTab: (tab: string) => void;
  showPasswordWarning: boolean;
}

export default function Dashboard({
  targets = [],
  personality = [],
  books = [],
  diary = [],
  setActiveTab,
  showPasswordWarning
}: DashboardProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; visible: boolean }>({
    x: 0,
    y: 0,
    text: '',
    visible: false
  });

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

  // Overall growth indicator: average of the rates
  const activeCategoriesCount = [totalTargets > 0, totalPersonality > 0, totalBooks > 0].filter(Boolean).length;
  const overallRate = activeCategoriesCount > 0 
    ? Math.round((targetRate + personalityRate + booksRate) / activeCategoriesCount) 
    : 0;

  // 2. Generate historical progress for the past 7 days
  const getGrowthData = () => {
    const dataPoints = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

      // Count stats up to this date
      const targetsUpToDate = targets.filter(t => t.createdAt.split('T')[0] <= dateStr);
      const targetsCompletedUpToDate = targets.filter(t => t.createdAt.split('T')[0] <= dateStr && t.status === 'completed' && t.updatedAt.split('T')[0] <= dateStr);
      const tRate = targetsUpToDate.length > 0 ? (targetsCompletedUpToDate.length / targetsUpToDate.length) : 0;

      const personalityUpToDate = personality.filter(p => p.createdAt.split('T')[0] <= dateStr);
      const personalityCompletedUpToDate = personality.filter(p => p.createdAt.split('T')[0] <= dateStr && p.status === 'completed' && p.updatedAt.split('T')[0] <= dateStr);
      const pRate = personalityUpToDate.length > 0 ? (personalityCompletedUpToDate.length / personalityUpToDate.length) : 0;

      const booksUpToDate = books.filter(b => b.createdAt.split('T')[0] <= dateStr);
      const booksCompletedUpToDate = books.filter(b => b.createdAt.split('T')[0] <= dateStr && b.status === 'completed' && b.updatedAt.split('T')[0] <= dateStr);
      const bRate = booksUpToDate.length > 0 ? (booksCompletedUpToDate.length / booksUpToDate.length) : 0;

      // Combined rate for this day
      const denominator = [targetsUpToDate.length > 0, personalityUpToDate.length > 0, booksUpToDate.length > 0].filter(Boolean).length;
      const combinedRate = denominator > 0 ? Math.round(((tRate + pRate + bRate) / denominator) * 100) : 0;

      dataPoints.push({
        label: displayStr,
        rawDate: dateStr,
        value: combinedRate,
        targets: targetsUpToDate.length > 0 ? Math.round(tRate * 100) : 0,
        personality: personalityUpToDate.length > 0 ? Math.round(pRate * 100) : 0,
        books: booksUpToDate.length > 0 ? Math.round(bRate * 100) : 0,
        diary: diary.filter(d => d.date <= dateStr).length
      });
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

      {showPasswordWarning && (
        <div className="password-banner">
          <div className="password-banner-text">
            <AlertTriangle size={20} />
            <span>
              <strong>Security Warning:</strong> You are currently using the default seeded password. For absolute data privacy, please change your password.
            </span>
          </div>
          <button 
            className="btn btn-sm btn-secondary" 
            style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
            onClick={() => setActiveTab('settings')}
          >
            Go to Settings
          </button>
        </div>
      )}

      {/* Stats Summary Panel */}
      <div className="dashboard-grid">
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
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 700 }}>Overall Growth Progress (%)</h2>
        
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
    </>
  );
}
