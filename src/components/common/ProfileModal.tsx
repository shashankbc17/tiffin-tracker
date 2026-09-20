import React, { useState, useRef } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { X, Camera, User as UserIcon, LogOut, Check, Cloud, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  user: User | null;
  onLogout: () => void;
  onClose: () => void;
  onProfileUpdated?: (name: string, photo: string | null) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onLogout,
  onClose,
  onProfileUpdated,
}) => {
  // Local stored custom profile overrides
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem('tiffin_custom_name') || user?.displayName || 'User';
  });

  const [avatarMode, setAvatarMode] = useState<'photo' | 'letter'>(() => {
    return (localStorage.getItem('tiffin_avatar_mode') as 'photo' | 'letter') || (user?.photoURL ? 'photo' : 'letter');
  });

  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    return localStorage.getItem('tiffin_custom_photo') || user?.photoURL || null;
  });

  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initial letter
  const initialLetter = (displayName || 'U').trim()[0].toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64 image
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomPhoto(dataUrl);
      setAvatarMode('photo');
      localStorage.setItem('tiffin_custom_photo', dataUrl);
      localStorage.setItem('tiffin_avatar_mode', 'photo');
    };
    reader.readAsDataURL(file);
  };

  const handleUseLetter = () => {
    setAvatarMode('letter');
    localStorage.setItem('tiffin_avatar_mode', 'letter');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim() || 'User';
    localStorage.setItem('tiffin_custom_name', trimmedName);

    if (user) {
      try {
        await updateProfile(user, {
          displayName: trimmedName,
          photoURL: avatarMode === 'photo' ? customPhoto : undefined,
        });
      } catch (err) {
        console.warn('Could not sync profile to Firebase:', err);
      }
    }

    if (onProfileUpdated) {
      onProfileUpdated(trimmedName, avatarMode === 'photo' ? customPhoto : null);
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Account Settings
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
              My Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar Presentation & Upload Options */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '22px' }}>
          <div
            style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              border: '3px solid var(--accent-primary)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            {avatarMode === 'photo' && customPhoto ? (
              <img
                src={customPhoto}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', letterSpacing: '1px' }}>
                {initialLetter}
              </span>
            )}
          </div>

          {/* Avatar Switch Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Hidden file input for capturing or picking photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Camera size={13} color="var(--accent-primary)" />
              <span>{avatarMode === 'photo' && customPhoto ? 'Change Photo' : 'Upload / Camera'}</span>
            </button>

            <button
              type="button"
              onClick={handleUseLetter}
              className={`ios-btn ${avatarMode === 'letter' ? 'ios-btn-primary' : 'ios-btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserIcon size={13} />
              <span>Show Letter</span>
            </button>
          </div>
        </div>

        {/* Profile Name & Details Form */}
        <form onSubmit={handleSave}>
          <div className="ios-input-group">
            <label className="ios-label">Your Name</label>
            <input
              type="text"
              className="ios-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Shashank"
              required
            />
          </div>

          {/* Account & Cloud Sync Status Card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--glass-border)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connected Google Account</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {user?.email || 'Guest / Local Mode'}
                </div>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: user ? '#34d399' : '#94a3b8',
                  background: user ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Cloud size={12} />
                <span>{user ? 'Synced' : 'Local'}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%' }}>
              <Check size={16} />
              <span>{isSaved ? 'Profile Saved!' : 'Save Changes'}</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="ios-btn"
                style={{
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  marginTop: '4px',
                }}
              >
                <LogOut size={16} />
                <span>Log Out of Account</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
