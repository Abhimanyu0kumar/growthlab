'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Sparkles, 
  BookOpen, 
  BookText, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  email: string;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, email, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'personality', label: 'Personality', icon: Sparkles },
    { id: 'books', label: 'Books Tracker', icon: BookOpen },
    { id: 'diary', label: 'Diary / Journal', icon: BookText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Sparkles size={28} className="sidebar-logo-icon" />
        <span>GROWTH LAB</span>
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  id={`nav-btn-${item.id}`}
                  className={`sidebar-item-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-badge">
          <div className="avatar">
            {email ? email.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="user-info">
            <span className="username" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{email || 'abhimanyu@gmail.com'}</span>
            <span className="role">Administrator</span>
          </div>
        </div>
        <button
          id="logout-button"
          className="sidebar-item-btn"
          style={{ color: '#ef4444', borderTop: 'none', paddingLeft: '0.5rem' }}
          onClick={onLogout}
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
