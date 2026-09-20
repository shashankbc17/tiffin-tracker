import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogIn, Cloud } from 'lucide-react';

interface IosHeaderProps {
  user: User | null;
  onLogin: () => void;
  onOpenProfile: () => void;
  packageTitle?: string;
}

export const IosHeader: React.FC<IosHeaderProps> = ({
  user,
  onLogin,
  onOpenProfile,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              title="Synced with Google Cloud"
            >
              <Cloud size={12} />
              <span>Cloud Sync</span>
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
                    border: '2px solid var(--accent-primary)',
                    objectFit: 'cover',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
              ) : (
                <div 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px',
                    color: '#ffffff'
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
          >
            <LogIn size={13} />
            <span>Google Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

