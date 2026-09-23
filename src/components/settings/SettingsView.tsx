import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { RateConfig } from '../../types';
import { Save, Smartphone, Key, Cloud, Check, Copy, ExternalLink, ShieldCheck, ChevronDown, ChevronUp, HelpCircle, Clock, AlertCircle, Trash2, PlayCircle, X, Sun, Moon, User as UserIcon } from 'lucide-react';
import { getSavedFirebaseConfig, saveFirebaseConfig, initFirebase, DEFAULT_FIREBASE_CONFIG } from '../../services/firebase';
import { InfoPopover } from '../common/InfoPopover';
import { ThemeMode, getStoredTheme, setTheme } from '../../services/theme';

interface SettingsViewProps {
  config: RateConfig;
  currentUser?: User | null;
  onSaveConfig: (cfg: RateConfig) => void;
  onResetData?: () => void;
  onClearAllData?: () => void;
  onWipeCloudData?: () => void;
  onOpenGuide?: () => void;
  onOpenProfile?: () => void;
}

// Helper to extract purely the 10-digit mobile number from any stored string
function extract10DigitPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) {
    return digits.slice(2, 12);
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    return digits.slice(1, 11);
  }
  return digits.slice(0, 10);
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  currentUser,
  onSaveConfig,
  onResetData,
  onClearAllData,
  onWipeCloudData,
  onOpenGuide,
  onOpenProfile,
}) => {
  const [formData, setFormData] = useState<RateConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showDevSettings, setShowDevSettings] = useState(false);

  // Theme Mode State for Settings view
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail) {
        setThemeMode(e.detail);
      }
    };
    window.addEventListener('tiffin_theme_changed', handleThemeChange);
    return () => window.removeEventListener('tiffin_theme_changed', handleThemeChange);
  }, []);

  // String states for numeric fields to prevent iPhone "stuck on 0" bug
  const [defaultPersonsStr, setDefaultPersonsStr] = useState(String(config.defaultPersons ?? 1));
  const [defaultBreakfastRateStr, setDefaultBreakfastRateStr] = useState(String(config.defaultBreakfastRate ?? 60));
  const [defaultLunchRateStr, setDefaultLunchRateStr] = useState(String(config.defaultLunchRate ?? 90));

  // Phone state: raw 10 digits
  const [phone10Digits, setPhone10Digits] = useState(() => extract10DigitPhone(config.catererPhone || ''));

  // Automated delivery state
  const [autoDeliveryEnabled, setAutoDeliveryEnabled] = useState(config.autoDeliveryEnabled ?? true);

  const isDev = Boolean(
    currentUser &&
    currentUser.email &&
    (currentUser.email.toLowerCase() === 'shashankbc17@gmail.com' ||
     currentUser.email.toLowerCase().includes('shashank'))
  );

  const [firebaseJson, setFirebaseJson] = useState(() => 
    JSON.stringify(getSavedFirebaseConfig(), null, 2)
  );
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [fbSaveSuccess, setFbSaveSuccess] = useState(false);

  const currentHost = window.location.hostname;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    // If user pasted a full number with country code 91 or 0
    if (val.startsWith('91') && val.length > 10) {
      val = val.slice(2);
    } else if (val.startsWith('0') && val.length > 10) {
      val = val.slice(1);
    }
    setPhone10Digits(val.slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (phone10Digits.length > 0 && phone10Digits.length < 10) {
      alert('Please enter a complete 10-digit mobile number, or leave it empty.');
      return;
    }

    const updatedConfig: RateConfig = {
      ...formData,
      defaultPersons: Math.max(1, parseInt(defaultPersonsStr, 10) || 1),
      defaultBreakfastRate: Math.max(0, parseInt(defaultBreakfastRateStr, 10) || 0),
      defaultLunchRate: Math.max(0, parseInt(defaultLunchRateStr, 10) || 0),
      catererPhone: phone10Digits ? `+91 ${phone10Digits}` : '',
      autoDeliveryEnabled,
    };

    onSaveConfig(updatedConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCopyHost = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleSaveFirebaseConfig = () => {
    try {
      const parsed = JSON.parse(firebaseJson);
      saveFirebaseConfig(parsed);
      initFirebase(parsed);
      setFbSaveSuccess(true);
      setTimeout(() => {
        setFbSaveSuccess(false);
        setShowFirebaseModal(false);
      }, 1500);
    } catch (err: any) {
      alert('Invalid JSON format: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Clean Settings Header */}
      <div 
        className="ios-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, var(--bg-card) 100%)', 
          borderColor: 'rgba(245, 158, 11, 0.3)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '14px 18px' 
        }}
      >
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Settings &amp; Preferences
          </h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Subscription defaults, caterer contact &amp; rules
          </div>
        </div>
        <InfoPopover
          title="Settings & Defaults"
          color="#fbbf24"
          content="Configure default meal prices, subscriber count, and caterer contact. These defaults are automatically used for new meal packages and daily statements."
        />
      </div>

      {/* Appearance & My Profile Card */}
      <div className="ios-card" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-heading)' }}>
              Appearance &amp; Theme
            </h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Switch between daylight white layout and sleek dark mode
            </div>
          </div>

          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '5px 10px', fontSize: '11px', borderRadius: 'var(--radius-full)', gap: '4px' }}
            >
              <UserIcon size={12} color="var(--accent-primary)" />
              <span>My Profile</span>
            </button>
          )}
        </div>

        {/* 3-Way Theme Switcher */}
        <div className="theme-picker-segmented">
          <button
            type="button"
            onClick={() => {
              setThemeMode('light');
              setTheme('light');
            }}
            className={`theme-picker-option ${themeMode === 'light' ? 'active' : ''}`}
            title="White / Light Theme"
          >
            <Sun size={15} color={themeMode === 'light' ? '#d97706' : 'currentColor'} />
            <span>Light (White)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setThemeMode('dark');
              setTheme('dark');
            }}
            className={`theme-picker-option ${themeMode === 'dark' ? 'active' : ''}`}
            title="Dark Theme"
          >
            <Moon size={15} color={themeMode === 'dark' ? '#38bdf8' : 'currentColor'} />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setThemeMode('system');
              setTheme('system');
            }}
            className={`theme-picker-option ${themeMode === 'system' ? 'active' : ''}`}
            title="Follow Device System Setting"
          >
            <Smartphone size={15} color={themeMode === 'system' ? '#10b981' : 'currentColor'} />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* Senior-Friendly How to Use Guide Card */}
      {onOpenGuide && (
        <div 
          onClick={onOpenGuide}
          className="ios-card" 
          style={{ 
            cursor: 'pointer', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--bg-card) 100%)', 
            borderColor: 'rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '8px', borderRadius: '50%' }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                📖 How to Use TiffinFlow Guide
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Simple, large-text instructions for seniors &amp; family members
              </div>
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>Open &gt;</span>
        </div>
      )}

      {/* Meal Rates & Cook Information */}
      <form onSubmit={handleSubmit} className="ios-card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
          Meal Rates &amp; Caterer Settings
        </h3>

        {/* Default Persons */}
        <div className="ios-input-group">
          <label className="ios-label" style={{ whiteSpace: 'nowrap' }}>Default Number of Persons</label>
          <input 
            type="text" 
            inputMode="numeric"
            pattern="[0-9]*"
            className="ios-input" 
            value={defaultPersonsStr} 
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*$/.test(val)) {
                setDefaultPersonsStr(val);
              }
            }} 
            placeholder="1"
            required 
          />
        </div>

        {/* Meal Rates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="ios-input-group">
            <label className="ios-label" style={{ whiteSpace: 'nowrap' }}>🍳 Breakfast ({formData.currency || '₹'}/p)</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="ios-input" 
              value={defaultBreakfastRateStr} 
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*$/.test(val)) {
                  setDefaultBreakfastRateStr(val);
                }
              }} 
              required 
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-label" style={{ whiteSpace: 'nowrap' }}>🍱 Lunch ({formData.currency || '₹'}/p)</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="ios-input" 
              value={defaultLunchRateStr} 
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*$/.test(val)) {
                  setDefaultLunchRateStr(val);
                }
              }} 
              required 
            />
          </div>
        </div>

        {/* Caterer Name */}
        <div className="ios-input-group">
          <label className="ios-label">Cook / Caterer Name</label>
          <input 
            type="text" 
            className="ios-input" 
            placeholder="e.g. Ramesh (Tiffin Provider)" 
            value={formData.catererName} 
            onChange={(e) => setFormData({ ...formData, catererName: e.target.value })} 
          />
        </div>

        {/* Caterer Phone with fixed +91 country badge and free 10-digit entry */}
        <div className="ios-input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label className="ios-label" style={{ margin: 0 }}>WhatsApp Number</label>
              <InfoPopover
                title="Caterer WhatsApp Contact"
                color="#34d399"
                content="Enter the 10-digit mobile number of your tiffin cook or caterer. Country code +91 is applied automatically so statements can be sent with a single tap."
              />
            </div>
            {phone10Digits.length === 10 ? (
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Check size={12} /> Ready
              </span>
            ) : phone10Digits.length > 0 ? (
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                {phone10Digits.length}/10 digits
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Fixed non-editable +91 country badge */}
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '14px',
                userSelect: 'none',
                flexShrink: 0
              }}
              title="Fixed Country Code (India +91)"
            >
              <span style={{ fontSize: '15px' }}>🇮🇳</span>
              <span>+91</span>
            </div>

            {/* Free 10-digit input with clear button */}
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="tel" 
                inputMode="numeric"
                className="ios-input" 
                placeholder="10-digit mobile number" 
                value={phone10Digits} 
                onChange={handlePhoneChange} 
                maxLength={10}
                style={{ width: '100%', paddingRight: phone10Digits ? '32px' : '12px' }}
              />
              {phone10Digits && (
                <button
                  type="button"
                  onClick={() => setPhone10Digits('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 0
                  }}
                  title="Clear number"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Automated Delivery Section */}
        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 14px', margin: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#60a5fa" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd' }}>
                Automated Delivery Marking
              </span>
              <InfoPopover
                title="Automated Delivery Cutoffs"
                color="#60a5fa"
                content={
                  <div>
                    <div>Automatically marks unlogged meals as delivered once window closes:</div>
                    <div style={{ marginTop: '6px', lineHeight: '1.6' }}>
                      • 🍳 <strong>Breakfast Cutoff:</strong> 11:00 AM IST<br />
                      • 🍱 <strong>Lunch Cutoff:</strong> 3:00 PM IST
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Never retroactively alters past history.
                    </div>
                  </div>
                }
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={autoDeliveryEnabled} 
                onChange={(e) => setAutoDeliveryEnabled(e.target.checked)} 
                style={{ accentColor: '#3b82f6' }} 
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: autoDeliveryEnabled ? '#34d399' : 'var(--text-muted)' }}>
                {autoDeliveryEnabled ? 'Active' : 'Off'}
              </span>
            </label>
          </div>
        </div>

        <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: '8px' }}>
          <Save size={16} />
          <span>{savedSuccess ? 'Settings Saved!' : 'Save Settings'}</span>
        </button>
      </form>

      {/* Cloud Sync & Backup Card */}
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '8px', borderRadius: '50%' }}>
              <Cloud size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Cloud Sync &amp; Multi-Plan Backup</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Your packages &amp; meal logs sync seamlessly across devices
              </p>
            </div>
          </div>
          <span className="badge badge-lunch" style={{ fontSize: '11px' }}>
            <ShieldCheck size={12} /> Active
          </span>
        </div>

        {/* Expandable Developer Section (Only visible when logged in as Developer) */}
        {isDev && (
          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              onClick={() => setShowDevSettings(!showDevSettings)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              <span>Developer &amp; Firebase Settings</span>
              {showDevSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDevSettings && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Authorized Domain:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <code style={{ fontSize: '12px', color: '#34d399', fontWeight: 700 }}>{currentHost}</code>
                    <button 
                      type="button" 
                      onClick={handleCopyHost}
                      className="ios-btn ios-btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: '10px' }}
                    >
                      {copiedDomain ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowFirebaseModal(true)}
                    className="ios-btn ios-btn-secondary"
                    style={{ flex: 1, fontSize: '11px', padding: '8px' }}
                  >
                    <Key size={13} />
                    <span>Configure Keys</span>
                  </button>

                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ios-btn ios-btn-secondary"
                    style={{ textDecoration: 'none', fontSize: '11px', padding: '8px 12px' }}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* App Installation Drawer Card */}
      <div 
        className="ios-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '7px', borderRadius: '50%' }}>
            <Smartphone size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Install as Mobile App
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Add to Home Screen (iPhone &amp; Android)
            </div>
          </div>
        </div>
        <InfoPopover
          title="How to Install TiffinFlow App"
          color="#38bdf8"
          content={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px', fontSize: '12.5px' }}>
                  🍎 iPhone (Safari)
                </div>
                <div style={{ fontSize: '11.5px', lineHeight: '1.6' }}>
                  1. Open URL in <strong>Safari</strong>.<br />
                  2. Tap <strong>Share</strong> button (square with arrow).<br />
                  3. Select <strong>"Add to Home Screen"</strong>.
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '4px', fontSize: '12.5px' }}>
                  🤖 Android (Chrome)
                </div>
                <div style={{ fontSize: '11.5px', lineHeight: '1.6' }}>
                  1. Open URL in <strong>Chrome</strong>.<br />
                  2. Tap <strong>three dots (⋮)</strong> at top right.<br />
                  3. Tap <strong>"Install app"</strong> or "Add to Home screen".
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* Data Management & Reset Section */}
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Data &amp; Plan Management</h4>
          <InfoPopover
            title="Data Management"
            color="#a78bfa"
            content="Manage local device cache, load demo starter plans, or purge data for a fresh start."
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {onResetData && (
            <button
              type="button"
              onClick={onResetData}
              className="ios-btn ios-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                color: '#a78bfa',
                borderColor: 'rgba(139, 92, 246, 0.4)',
              }}
            >
              <PlayCircle size={15} />
              <span>Load Starter Sample Data (Demo)</span>
            </button>
          )}

          {onClearAllData && (
            <button
              type="button"
              onClick={onClearAllData}
              className="ios-btn ios-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.4)',
              }}
            >
              <Trash2 size={15} />
              <span>Clear All Plans &amp; Logs (Fresh Start)</span>
            </button>
          )}

          {/* Cloud Database Purge (when signed in or admin) */}
          {currentUser && onWipeCloudData && (
            <div
              style={{
                marginTop: '8px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ fontSize: '12.5px', color: '#fca5a5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔥 Firebase Cloud Database</span>
                  {isDev && (
                    <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '1px 6px', borderRadius: 'var(--radius-full)', color: '#f87171', fontWeight: 700 }}>
                      Admin
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{currentUser.email}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                Permanently wipes your cloud document (<code style={{ color: '#cbd5e1' }}>users/{currentUser.uid}</code>) from Cloud Firestore. Use this to erase any legacy synced data so refreshing will never restore old plans or meal records.
              </p>
              <button
                type="button"
                onClick={onWipeCloudData}
                className="ios-btn ios-btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  fontSize: '12.5px',
                  color: '#ef4444',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  background: 'rgba(239, 68, 68, 0.08)',
                }}
              >
                <Trash2 size={15} />
                <span>Delete All Cloud Data in Firebase</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom Firebase Config Modal */}
      {showFirebaseModal && (
        <div className="modal-overlay" onClick={() => setShowFirebaseModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>
              Firebase Project Configuration
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Paste your Firebase Web App configuration object below:
            </p>

            <textarea
              className="ios-input"
              rows={10}
              style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%', marginBottom: '14px', whiteSpace: 'pre' }}
              value={firebaseJson}
              onChange={(e) => setFirebaseJson(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setFirebaseJson(JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2));
                  saveFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
                  initFirebase(DEFAULT_FIREBASE_CONFIG);
                  alert('Reset to default Firebase configuration.');
                }}
                className="ios-btn ios-btn-secondary"
                style={{ flex: 1, fontSize: '12px' }}
              >
                Reset Default
              </button>

              <button
                type="button"
                onClick={handleSaveFirebaseConfig}
                className="ios-btn ios-btn-primary"
                style={{ flex: 1, fontSize: '12px' }}
              >
                {fbSaveSuccess ? 'Saved!' : 'Save &amp; Reload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
