import React from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, Sparkles, Cloud, CloudOff } from 'lucide-react';

interface IosHeaderProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  packageTitle?: string;
}

export const IosHeader: React.FC<IosHeaderProps> = ({
  user,
  onLogin,
  onLogout,
  packageTitle,
}) => {
  return (
    <header className="ios-header">
      <div className="ios-header-title">
        <span style={{ fontSize: '24px' }}>🍱</span>
        <div>
          <span className="brand-gradient" style={{ fontWeight: 800 }}>TiffinFlow</span>
          {packageTitle && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {packageTitle}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
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
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--accent-primary)' }}
              />
            ) : (
              <div 
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px'
                }}
              >
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <button 
              onClick={onLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '4px'
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
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
