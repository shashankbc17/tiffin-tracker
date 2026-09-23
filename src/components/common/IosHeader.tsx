import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogIn, Cloud, HelpCircle } from 'lucide-react';

interface IosHeaderProps {
  user: User | null;
  isAuthLoading?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'local_only';
  onLogin: () => void;
  onOpenProfile: () => void;
  onOpenGuide?: () => void;
  onOpenSyncModal?: () => void;
  packageTitle?: string;
}

export const IosHeader: React.FC<IosHeaderProps> = ({
  user,
  isAuthLoading = false,
  syncStatus = 'local_only',
  onLogin,
  onOpenProfile,
  onOpenGuide,
  onOpenSyncModal,
  packageTitle,
}) => {
  // Read local custom photo/letter preferences
  const customName = localStorage.getItem('tiffin_custom_name') || user?.displayName || 'User';
  const avatarMode = localStorage.getItem('tiffin_avatar_mode') || (user?.photoURL ? 'photo' : 'letter');
  const customPhoto = localStorage.getItem('tiffin_custom_photo') || user?.photoURL || null;

  const initialLetter = (customName || 'U').trim()[0].toUpperCase();

  return (
    <header className="ios-header">
      <div className="ios-header-title">
        <span style={{ fontSize: '24px' }}>🍱</span>
        <div>
          <span className="brand-gradient" style={{ fontWeight: 800, fontSize: '18px' }}>
            MealSync
          </span>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {packageTitle || 'Breakfast & Lunch Service'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {onOpenGuide && (
          <button
            type="button"
            onClick={onOpenGuide}
            className="ios-btn ios-btn-secondary"
            style={{ 
              padding: '5px 9px', 
              fontSize: '11.5px', 
              borderRadius: 'var(--radius-full)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399'
            }}
            title="How to Use App Guide"
          >
            <HelpCircle size={13} />
            <span>Guide</span>
          </button>
        )}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              onClick={onOpenSyncModal}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                background: syncStatus === 'error' 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : syncStatus === 'syncing'
                  ? 'rgba(56, 189, 248, 0.15)'
                  : 'rgba(16, 185, 129, 0.12)',
                border: syncStatus === 'error' 
                  ? '1px solid rgba(239, 68, 68, 0.4)' 
                  : syncStatus === 'syncing'
                  ? '1px solid rgba(56, 189, 248, 0.4)'
                  : '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 9px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                color: syncStatus === 'error' ? '#f87171' : syncStatus === 'syncing' ? '#38bdf8' : '#34d399',
                cursor: 'pointer',
              }}
              title="Click to check Cloud Sync status & diagnostics"
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: syncStatus === 'error' ? '#ef4444' : syncStatus === 'syncing' ? '#38bdf8' : '#10b981',
                  boxShadow: syncStatus === 'error' ? '0 0 8px #ef4444' : '0 0 8px #10b981',
                  display: 'inline-block',
                }}
              />
              <Cloud size={12} />
              <span>
                {syncStatus === 'error' 
                  ? 'Setup Cloud DB' 
                  : syncStatus === 'syncing' 
                  ? 'Syncing...' 
                  : 'Live Sync'}
              </span>
            </button>
          </div>
        ) : isAuthLoading ? (
          /* Subtle clean placeholder while Firebase resolves session on reload */
          <div style={{ width: '80px', height: '32px' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  borderRadius: 'var(--radius-full)',
                  padding: '5px 8px',
                  fontSize: '10.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Tap to see why devices are not syncing"
              >
                <span>📱 Local</span>
              </button>
            )}
            <button 
              onClick={onLogin}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11.5px', borderRadius: 'var(--radius-full)' }}
              title="Sign in with Google on all devices to sync meals in real-time"
            >
              <LogIn size={12} />
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* Tap Avatar to Open My Profile Modal (Available to all users) */}
        <button
          onClick={onOpenProfile}
          title="My Profile & Appearance"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '2px'
          }}
        >
          {avatarMode === 'photo' && customPhoto ? (
            <img 
              src={customPhoto} 
              alt={customName} 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-primary)'
              }} 
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), #059669)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              {initialLetter}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};

