import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { RateConfig } from '../../types';
import { Save, Smartphone, Key, Cloud, Check, Copy, ExternalLink, ShieldCheck, ChevronDown, ChevronUp, HelpCircle, Clock, AlertCircle, Trash2, PlayCircle } from 'lucide-react';
import { getSavedFirebaseConfig, saveFirebaseConfig, initFirebase, DEFAULT_FIREBASE_CONFIG } from '../../services/firebase';

interface SettingsViewProps {
  config: RateConfig;
  currentUser?: User | null;
  onSaveConfig: (cfg: RateConfig) => void;
  onResetData?: () => void;
  onClearAllData?: () => void;
  onOpenGuide?: () => void;
}

// Helpers for Indian mobile phone numbers (+91 strictly 10 digits starting with 6-9)
function cleanIndianPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  }
  // Hard limit strictly to 10 digits (will not take extra digits)
  return digits.slice(0, 10);
}

function formatIndianPhone(digits10: string): string {
  if (!digits10) return '';
  if (digits10.length <= 5) {
    return `+91 ${digits10}`;
  }
  return `+91 ${digits10.slice(0, 5)} ${digits10.slice(5, 10)}`;
}

function isIndianPhoneValid(digits10: string): boolean {
  return /^[6-9]\d{9}$/.test(digits10);
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  currentUser,
  onSaveConfig,
  onResetData,
  onClearAllData,
  onOpenGuide,
}) => {
  const [formData, setFormData] = useState<RateConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showDevSettings, setShowDevSettings] = useState(false);

  // String states for numeric fields to prevent iPhone "stuck on 0" bug
  const [defaultPersonsStr, setDefaultPersonsStr] = useState(String(config.defaultPersons ?? 1));
  const [defaultBreakfastRateStr, setDefaultBreakfastRateStr] = useState(String(config.defaultBreakfastRate ?? 60));
  const [defaultLunchRateStr, setDefaultLunchRateStr] = useState(String(config.defaultLunchRate ?? 90));

  // Phone state: raw 10 digits
  const [phoneDigits, setPhoneDigits] = useState(() => cleanIndianPhone(config.catererPhone || ''));

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

  const phoneIsValid = phoneDigits.length === 0 || isIndianPhoneValid(phoneDigits);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = cleanIndianPhone(raw);
    setPhoneDigits(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (phoneDigits.length > 0 && !isIndianPhoneValid(phoneDigits)) {
      alert('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    const updatedConfig: RateConfig = {
      ...formData,
      defaultPersons: Math.max(1, parseInt(defaultPersonsStr, 10) || 1),
      defaultBreakfastRate: Math.max(0, parseInt(defaultBreakfastRateStr, 10) || 0),
      defaultLunchRate: Math.max(0, parseInt(defaultLunchRateStr, 10) || 0),
      catererPhone: phoneDigits ? formatIndianPhone(phoneDigits) : '',
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
      {/* Workshop Header */}
      <div 
        className="ios-card" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)', 
          borderColor: 'rgba(245, 158, 11, 0.35)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '14px', 
          padding: '16px 18px' 
        }}
      >
        <div 
          style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '18px', 
            overflow: 'hidden', 
            flexShrink: 0, 
            border: '2px solid #f59e0b', 
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)' 
          }}
        >
          <img 
            src="./assets/anime_settings.jpg" 
            alt="Inosuke Workshop" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <span 
            style={{ 
              fontSize: '10px', 
              color: '#fbbf24', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}
          >
            ⚙️ Beast Workshop &amp; Config
          </span>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '2px 0' }}>
            Settings &amp; Catering Preferences
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
            Configure default prices, caterer contact, phone MFA, and automated rules.
          </p>
        </div>
      </div>

      {/* Senior-Friendly How to Use Guide Card */}
      {onOpenGuide && (
        <div 
          onClick={onOpenGuide}
          className="ios-card" 
          style={{ 
            cursor: 'pointer', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)', 
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
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                📖 How to Use TiffinFlow Guide
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Simple, large-text instructions for seniors &amp; family members
              </div>
            </div>
          </div>
          <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 700 }}>Open &gt;</span>
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

        {/* Caterer Phone with strict Indian (+91) 10-digit validation */}
        <div className="ios-input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="ios-label">WhatsApp Number (Indian 10-Digit Mobile)</label>
            {phoneDigits.length === 10 && isIndianPhoneValid(phoneDigits) ? (
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Check size={12} /> Valid Indian Mobile
              </span>
            ) : phoneDigits.length > 0 ? (
              <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <AlertCircle size={12} /> {phoneDigits.length}/10 digits (Starts with 6-9)
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>10 digits</span>
            )}
          </div>
          <input 
            type="text" 
            inputMode="tel"
            className="ios-input" 
            placeholder="e.g. 98765 43210" 
            value={formatIndianPhone(phoneDigits)} 
            onChange={handlePhoneChange} 
            maxLength={16}
          />
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Automatically prefixed with +91 · Strictly limits to 10 digits without extra numbers.
          </div>
        </div>

        {/* Automated Delivery Section */}
        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 14px', margin: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#60a5fa" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd' }}>
                Automated Delivery Marking
              </span>
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
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Automatically marks unlogged meals as delivered once delivery timing window closes:
            <br />
            🍳 <strong>Breakfast Cutoff:</strong> 11:00 AM IST &nbsp;|&nbsp; 🍱 <strong>Lunch Cutoff:</strong> 3:00 PM IST
          </p>
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

      {/* App Installation Guide (iPhone & Android) */}
      <div className="ios-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Smartphone size={20} color="var(--accent-primary)" />
          <h4 style={{ fontSize: '15px', fontWeight: 700 }}>How to Install as App (iPhone &amp; Android)</h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* iPhone */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🍎 iPhone (Safari)</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              1. Open URL in <strong>Safari</strong>.<br />
              2. Tap the <strong>Share</strong> button (box with upward arrow).<br />
              3. Tap <strong>"Add to Home Screen"</strong>.<br />
              4. Launches full-screen like a native iOS app!
            </p>
          </div>

          {/* Android */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#34d399', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🤖 Android (Chrome)</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              1. Open URL in <strong>Chrome</strong>.<br />
              2. Tap the <strong>three dots (⋮)</strong> at top right.<br />
              3. Tap <strong>"Install app"</strong> (or "Add to Home screen").<br />
              4. Installs into your app drawer with an app icon!
            </p>
          </div>
        </div>
      </div>

      {/* Data Management & Reset Section */}
      <div className="ios-card">
        <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Data &amp; Plan Management</h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          Manage your local &amp; cloud data, test-drive features with sample subscriptions, or clear data to start fresh.
        </p>

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
