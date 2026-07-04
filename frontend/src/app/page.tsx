'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Targets from '@/components/Targets';
import Personality from '@/components/Personality';
import Books from '@/components/Books';
import Diary from '@/components/Diary';
import Settings from '@/components/Settings';

export default function Home() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
    });
    return response;
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App Navigation and Data State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbData, setDbData] = useState<{
    targets: any[];
    personality: any[];
    books: any[];
    diary: any[];
  }>({
    targets: [],
    personality: [],
    books: [],
    diary: []
  });

  // Verify Auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await apiFetch('/auth/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setUsername(data.username);
          setIsDefaultPassword(data.isDefaultPassword || false);
          fetchDbData();
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const fetchDbData = async () => {
    try {
      const res = await apiFetch('/db');
      if (res.ok) {
        const data = await res.json();
        setDbData({
          targets: data.targets || [],
          personality: data.personality || [],
          books: data.books || [],
          diary: data.diary || []
        });
      }
    } catch (err) {
      console.error('Failed to load tracker database:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUsername || !loginPassword) return;

    setIsLoggingIn(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setUsername(data.username);
        // Refresh auth profile check to retrieve password warning state
        await checkAuth();
      } else {
        const err = await res.json();
        setAuthError(err.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setAuthError('Unable to connect to authentication service.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUsername('');
      setIsDefaultPassword(false);
      setDbData({ targets: [], personality: [], books: [], diary: [] });
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDbAction = async (action: 'create' | 'update' | 'delete', item: any) => {
    try {
      const res = await apiFetch('/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, collection: activeTab, item })
      });

      if (res.ok) {
        const data = await res.json();
        setDbData({
          targets: data.targets || [],
          personality: data.personality || [],
          books: data.books || [],
          diary: data.diary || []
        });
      } else {
        const err = await res.json();
        console.error('DB action error:', err.error);
        alert(`Failed to save changes: ${err.error}`);
      }
    } catch (err) {
      console.error('Network error during DB action:', err);
    }
  };

  const handleFileUpload = async (file: File, bookId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bookId', bookId);

    const res = await apiFetch('/books', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      // Re-fetch db data to get the updated book record with file names
      await fetchDbData();
      return await res.json();
    } else {
      const err = await res.json();
      throw new Error(err.error || 'File upload failed');
    }
  };

  const handleUpdateProfile = async (payload: { currentPassword: string; newPassword?: string; newUsername?: string }) => {
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUsername(data.username);
        // Refresh default password check
        await checkAuth();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error occurred.' };
    }
  };

  // Rendering loading state
  if (isAuthenticated === null) {
    return (
      <div className="login-wrapper">
        <div className="login-bg-glow" />
        <div className="glass-panel text-center" style={{ padding: '2rem' }}>
          <Sparkles size={36} className="sidebar-logo-icon" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <div>Decrypting user session...</div>
        </div>
      </div>
    );
  }

  // Render Login view
  if (!isAuthenticated) {
    return (
      <div className="login-wrapper">
        <div className="login-bg-glow" />

        <div className="glass-panel login-card">
          <div className="login-logo">
            <Sparkles size={32} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            <span>GROWTH LAB</span>
          </div>
          <p className="login-subtitle">Secured, Fully Encrypted Personal Progression Space</p>

          {authError && <div className="error-message" id="login-error-msg">{authError}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Admin Username</label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="E.g., Abhimanyu"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                disabled={isLoggingIn}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter secure password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoggingIn}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dark)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn"
              disabled={isLoggingIn}
              style={{ marginTop: '1rem' }}
            >
              {isLoggingIn ? 'Decrypting Vault...' : 'Access Tracker'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-dark)', fontSize: '0.75rem' }}>
            <Lock size={12} />
            <span>AES-256-GCM Vault Protection Active</span>
          </div>
        </div>
      </div>
    );
  }

  // Render main app layout
  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        username={username}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            targets={dbData.targets}
            personality={dbData.personality}
            books={dbData.books}
            diary={dbData.diary}
            setActiveTab={setActiveTab}
            showPasswordWarning={isDefaultPassword}
          />
        )}

        {activeTab === 'targets' && (
          <Targets
            targets={dbData.targets}
            onAction={handleDbAction}
          />
        )}

        {activeTab === 'personality' && (
          <Personality
            personality={dbData.personality}
            onAction={handleDbAction}
          />
        )}

        {activeTab === 'books' && (
          <Books
            books={dbData.books}
            onAction={handleDbAction}
            onFileUpload={handleFileUpload}
          />
        )}

        {activeTab === 'diary' && (
          <Diary
            diary={dbData.diary}
            onAction={handleDbAction}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            username={username}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>
    </div>
  );
}
