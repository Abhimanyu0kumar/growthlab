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
import { getBgImageDb, setBgImageDb } from '@/lib/idb';

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
  const [email, setEmail] = useState('');
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

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

  // Background Image State
  const [bgImage, setBgImage] = useState<string | null>(null);

  // Apply bgImage updates to document.body style
  useEffect(() => {
    getBgImageDb().then((saved) => {
      if (saved) {
        setBgImage(saved);
        document.body.style.backgroundImage = `url(${saved})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
      }
    });
  }, []);

  const handleUpdateBgImage = async (image: string | null) => {
    setBgImage(image);
    await setBgImageDb(image);
    if (image) {
      document.body.style.backgroundImage = `url(${image})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundPosition = 'center';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundAttachment = '';
      document.body.style.backgroundPosition = '';
    }
  };

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
          setEmail(data.email);
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
    if (!loginEmail || !loginPassword) return;

    setIsLoggingIn(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setEmail(data.email);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!registerEmail || !registerPassword || !registerConfirmPassword) return;

    if (registerPassword !== registerConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setIsSigningUp(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail, password: registerPassword })
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setEmail(data.email);
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setIsRegistering(false);
        await checkAuth();
      } else {
        const err = await res.json();
        setAuthError(err.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setAuthError('Unable to connect to authentication service.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setEmail('');
      setIsDefaultPassword(false);
      setDbData({ targets: [], personality: [], books: [], diary: [] });
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDbAction = async (action: 'create' | 'update' | 'delete', item: any, targetCollection?: string) => {
    try {
      const res = await apiFetch('/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, collection: targetCollection || activeTab, item })
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

  const handleUpdateProfile = async (payload: { currentPassword: string; newPassword?: string; newEmail?: string }) => {
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmail(data.email);
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
          <p className="login-subtitle">
            {isRegistering ? 'Start Your Personal Progression Journey' : 'Secured, Fully Encrypted Personal Progression Space'}
          </p>

          {authError && <div className="error-message" id="login-error-msg" style={{ color: 'var(--accent-paused)', marginBottom: '1rem', fontSize: '0.875rem' }}>{authError}</div>}

          {isRegistering ? (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email Address</label>
                <input
                  id="register-email"
                  type="email"
                  className="form-input"
                  placeholder="E.g., abhimanyu@gmail.com"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  disabled={isSigningUp}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter secure password"
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isSigningUp}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
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
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-confirm-password">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="register-confirm-password"
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter password"
                    required
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    disabled={isSigningUp}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
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
                    {showRegisterConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                className="btn"
                disabled={isSigningUp}
                style={{ marginTop: '1rem' }}
              >
                {isSigningUp ? 'Creating Account...' : 'Sign Up & Register'}
              </button>

              <div style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setAuthError('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  Log In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="E.g., abhimanyu@gmail.com"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
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

              <div style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setAuthError('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  Sign Up
                </button>
              </div>
            </form>
          )}

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
        email={email}
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
            onAction={handleDbAction}
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
            email={email}
            onUpdateProfile={handleUpdateProfile}
            bgImage={bgImage}
            onUpdateBgImage={handleUpdateBgImage}
          />
        )}
      </main>
    </div>
  );
}
