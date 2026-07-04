'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Database, RefreshCw } from 'lucide-react';

interface SettingsProps {
  username: string;
  onUpdateProfile: (data: { currentPassword: string; newPassword?: string; newUsername?: string }) => Promise<{ success: boolean; error?: string }>;
}

export default function Settings({ username, onUpdateProfile }: SettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState(username);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('You must enter your current password to make changes.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New password and password confirmation do not match.');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = { currentPassword };
      if (newPassword) payload.newPassword = newPassword;
      if (newUsername && newUsername !== username) payload.newUsername = newUsername;

      const result = await onUpdateProfile(payload);
      if (result.success) {
        setSuccessMsg('Account credentials updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(result.error || 'Failed to update credentials. Please check your current password.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="view-header">
        <div>
          <h1 className="view-title">Settings & Security</h1>
          <p className="view-subtitle">Change administrative credentials and view database encryption status.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Security & Credentials Card */}
        <div className="glass-panel">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <Lock size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>Administrative Credentials</span>
          </h2>

          {errorMsg && <div className="error-message">{errorMsg}</div>}
          {successMsg && (
            <div className="error-message" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="settings-section">
            <div className="settings-row">
              <div className="settings-label-col">
                <label className="settings-label" htmlFor="settings-username">Username</label>
                <span className="settings-desc">Change the administrator login username.</span>
              </div>
              <div>
                <input
                  id="settings-username"
                  type="text"
                  className="form-input"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label-col">
                <label className="settings-label" htmlFor="settings-current-pwd">Current Password</label>
                <span className="settings-desc">Required to authorize any credential changes.</span>
              </div>
              <div>
                <input
                  id="settings-current-pwd"
                  type="password"
                  className="form-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label-col">
                <label className="settings-label" htmlFor="settings-new-pwd">New Password</label>
                <span className="settings-desc">Set a new secure password (min 4 characters). Leave blank if not changing.</span>
              </div>
              <div>
                <input
                  id="settings-new-pwd"
                  type="password"
                  className="form-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-label-col">
                <label className="settings-label" htmlFor="settings-confirm-pwd">Confirm New Password</label>
                <span className="settings-desc">Re-type new password to verify.</span>
              </div>
              <div>
                <input
                  id="settings-confirm-pwd"
                  type="password"
                  className="form-input"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                id="save-settings-btn"
                type="submit"
                className="btn"
                style={{ width: 'auto' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Database Encryption Information Card */}
        <div className="glass-panel">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <Database size={20} style={{ color: 'var(--accent-secondary)' }} />
            <span>Database Storage & Security</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <p>
              Your application now stores its textual data in MySQL. The database connection uses the local MySQL server and the credentials configured in <code style={{ color: 'var(--accent-primary)' }}>.env.local</code>.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', color: '#34d399' }}>
              <ShieldCheck size={20} style={{ flexShrink: 0 }} />
              <span>
                <strong>File security:</strong> Book upload files are still encrypted on disk under <code style={{ color: 'var(--accent-primary)' }}>data/uploads</code> so attachments remain protected even as metadata moves into MySQL.
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>
              Database credentials are read from <code style={{ color: 'var(--text-muted)' }}>.env.local</code>. If you want to change the connection, update <code style={{ color: 'var(--text-muted)' }}>DB_HOST</code>, <code style={{ color: 'var(--text-muted)' }}>DB_USER</code>, <code style={{ color: 'var(--text-muted)' }}>DB_PASSWORD</code>, and <code style={{ color: 'var(--text-muted)' }}>DB_NAME</code>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
