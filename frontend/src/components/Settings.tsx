'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Database, RefreshCw, Image } from 'lucide-react';

interface SettingsProps {
  email: string;
  onUpdateProfile: (data: { currentPassword: string; newPassword?: string; newEmail?: string }) => Promise<{ success: boolean; error?: string }>;
  bgImage: string | null;
  onUpdateBgImage: (image: string | null) => void;
  bgSizing: 'cover' | 'contain' | 'repeat';
  bgBlur: number;
  bgBrightness: number;
  onUpdateAppearance: (updates: { sizing?: 'cover' | 'contain' | 'repeat'; blur?: number; brightness?: number }) => void;
}

export default function Settings({ 
  email, 
  onUpdateProfile, 
  bgImage, 
  onUpdateBgImage,
  bgSizing,
  bgBlur,
  bgBrightness,
  onUpdateAppearance
}: SettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState(email);

  const [customUrl, setCustomUrl] = useState('');
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
      if (newEmail && newEmail !== email) payload.newEmail = newEmail;

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
                <label className="settings-label" htmlFor="settings-email">Email Address</label>
                <span className="settings-desc">Change the administrator login email address.</span>
              </div>
              <div>
                <input
                  id="settings-email"
                  type="email"
                  className="form-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
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

        {/* Background Customization Card */}
        <div className="glass-panel">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <Image size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>Application Background</span>
          </h2>
          
          <div className="settings-section">
            {/* Presets Row */}
            <div className="settings-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
              <div className="settings-label-col" style={{ maxWidth: '100%' }}>
                <span className="settings-label">Preset Dark Backgrounds</span>
                <span className="settings-desc">Choose a curated premium dark-aesthetic preset background.</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div 
                  onClick={() => onUpdateBgImage(null)}
                  style={{ 
                    height: '80px', 
                    borderRadius: '8px', 
                    border: bgImage === null ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)', 
                    background: 'radial-gradient(circle at 50% 50%, #0d0c15 0%, #050508 100%)', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: bgImage === null ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  Default Theme
                </div>
                
                {[
                  { name: 'Cosmos Stars', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=600' },
                  { name: 'Neon Wave', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600' },
                  { name: 'Deep Mesh', url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=600' },
                  { name: 'Minimal Lines', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=600' }
                ].map((preset) => (
                  <div 
                    key={preset.name}
                    onClick={() => onUpdateBgImage(preset.url)}
                    style={{ 
                      height: '80px', 
                      borderRadius: '8px', 
                      border: bgImage === preset.url ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)', 
                      backgroundImage: `url(${preset.url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '0.4rem',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)',
                      zIndex: 1
                    }} />
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#ffffff',
                      zIndex: 2,
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                    }}>
                      {preset.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sizing Selector */}
            <div className="settings-row" style={{ marginTop: '1.5rem' }}>
              <div className="settings-label-col">
                <span className="settings-label">Image Sizing</span>
                <span className="settings-desc">Choose how the background image fits or repeats on screen.</span>
              </div>
              <div>
                <select
                  value={bgSizing}
                  onChange={(e) => onUpdateAppearance({ sizing: e.target.value as any })}
                  style={{
                    background: '#1f2937',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    padding: '0.4rem 0.8rem',
                    outline: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '200px'
                  }}
                >
                  <option value="cover">Cover (Stretch)</option>
                  <option value="contain">Contain (Fit)</option>
                  <option value="repeat">Tile (Repeat)</option>
                </select>
              </div>
            </div>

            {/* Blur Slider */}
            <div className="settings-row" style={{ marginTop: '1.5rem' }}>
              <div className="settings-label-col">
                <span className="settings-label">Background Blur ({bgBlur}px)</span>
                <span className="settings-desc">Apply blur filters to create a smooth glass effect.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '300px' }}>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={bgBlur}
                  onChange={(e) => onUpdateAppearance({ blur: parseInt(e.target.value) })}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{bgBlur}px</span>
              </div>
            </div>

            {/* Brightness Slider */}
            <div className="settings-row" style={{ marginTop: '1.5rem' }}>
              <div className="settings-label-col">
                <span className="settings-label">Background Brightness ({bgBrightness}%)</span>
                <span className="settings-desc">Dim the image to maintain readable text contrast.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '300px' }}>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={bgBrightness}
                  onChange={(e) => onUpdateAppearance({ brightness: parseInt(e.target.value) })}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{bgBrightness}%</span>
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="settings-row" style={{ marginTop: '1.5rem' }}>
              <div className="settings-label-col">
                <span className="settings-label">Custom Image URL</span>
                <span className="settings-desc">Paste the direct URL to any background image.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://example.com/image.jpg"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button"
                  className="btn"
                  style={{ width: 'auto', padding: '0.625rem 1.25rem' }}
                  onClick={() => {
                    if (customUrl.trim()) {
                      onUpdateBgImage(customUrl.trim());
                    }
                  }}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* File Upload Row */}
            <div className="settings-row" style={{ marginTop: '1.5rem' }}>
              <div className="settings-label-col">
                <span className="settings-label">Upload Custom Image</span>
                <span className="settings-desc">Select a local image file from your device (Max 75MB).</span>
              </div>
              <div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 75 * 1024 * 1024) {
                      alert('Please choose an image smaller than 75MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string;
                      if (base64) {
                        onUpdateBgImage(base64);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  style={{ display: 'none' }}
                  id="custom-bg-upload"
                />
                <label 
                  htmlFor="custom-bg-upload"
                  className="btn btn-secondary"
                  style={{ 
                    display: 'inline-block',
                    width: 'auto',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  Select Local Image
                </label>
              </div>
            </div>

            {/* Reset Theme Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 'auto', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                onClick={() => {
                  onUpdateBgImage(null);
                  setCustomUrl('');
                }}
              >
                Reset to Default Theme
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
