import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogIn, Cloud, HelpCircle } from 'lucide-react';

interface IosHeaderProps {
  user: User | null;
  onLogin: () => void;
  onOpenProfile: () => void;
  onOpenGuide?: () => void;
  packageTitle?: string;
}

export const IosHeader: React.FC<IosHeaderProps> = ({
  user,
  onLogin,
  onOpenProfile,
  onOpenGuide,
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
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                color: '#34d399'
              }}
              title="Real-Time Sync Active across all your signed-in devices"
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981',
                  display: 'inline-block',
                }}
              />
              <Cloud size={12} />
              <span>Live Sync</span>
            </div>

            {/* Tap Avatar to Open Profile Modal */}
            <button
              onClick={onOpenProfile}
              title="My Profile & Settings"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
        ) : (
          <button 
            onClick={onLogin}
            className="ios-btn ios-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: 'var(--radius-full)' }}
            title="Sign in with Google on all devices to sync meals in real-time"
          >
            <LogIn size={13} />
            <span>Sign In to Sync</span>
          </button>
        )}
      </div>
    </header>
  );
};

