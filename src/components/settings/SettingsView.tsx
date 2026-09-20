import React, { useState } from 'react';
import { RateConfig } from '../../types';
import { Save, RefreshCw, Smartphone, Key, Cloud, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { getSavedFirebaseConfig, saveFirebaseConfig, initFirebase, DEFAULT_FIREBASE_CONFIG } from '../../services/firebase';

interface SettingsViewProps {
  config: RateConfig;
  onSaveConfig: (cfg: RateConfig) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onSaveConfig,
  onResetData,
}) => {
  const [formData, setFormData] = useState<RateConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  const [firebaseJson, setFirebaseJson] = useState(() => 
    JSON.stringify(getSavedFirebaseConfig(), null, 2)
  );
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [fbSaveSuccess, setFbSaveSuccess] = useState(false);

  const currentHost = window.location.hostname;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
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

  const handleResetToDefaultFirebase = () => {
    setFirebaseJson(JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2));
    saveFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    initFirebase(DEFAULT_FIREBASE_CONFIG);
    alert('Reset to Heirloom Cookbook Firebase Project!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Meal Rates & Cook Information */}
      <form onSubmit={handleSubmit} className="ios-card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
          Meal Rates & Caterer Settings
        </h3>

        {/* Currency & Persons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
          <div className="ios-input-group">
            <label className="ios-label">Currency</label>
            <input 
              type="text" 
              className="ios-input" 
              value={formData.currency} 
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })} 
              required 
            />
          </div>

          <div className="ios-input-group">
            <label className="ios-label">Default Persons</label>
            <input 
              type="number" 
              min={1} 
              className="ios-input" 
              value={formData.defaultPersons} 
              onChange={(e) => setFormData({ ...formData, defaultPersons: Number(e.target.value) })} 
              required 
            />
          </div>
        </div>

        {/* Breakfast Rate */}
        <div className="ios-input-group">
          <label className="ios-label">🍳 Default Breakfast Rate (per meal / per person)</label>
          <input 
            type="number" 
            className="ios-input" 
            value={formData.defaultBreakfastRate} 
            onChange={(e) => setFormData({ ...formData, defaultBreakfastRate: Number(e.target.value) })} 
            required 
          />
        </div>

        {/* Lunch Rate */}
        <div className="ios-input-group">
          <label className="ios-label">🍱 Default Lunch Rate (per meal / per person)</label>
          <input 
            type="number" 
            className="ios-input" 
            value={formData.defaultLunchRate} 
            onChange={(e) => setFormData({ ...formData, defaultLunchRate: Number(e.target.value) })} 
            required 
          />
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

        {/* Caterer Phone */}
        <div className="ios-input-group">
          <label className="ios-label">WhatsApp Number (with country code)</label>
          <input 
            type="text" 
            className="ios-input" 
            placeholder="e.g. +91 98765 43210" 
            value={formData.catererPhone} 
            onChange={(e) => setFormData({ ...formData, catererPhone: e.target.value })} 
          />
        </div>

        <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%', marginTop: '8px' }}>
          <Save size={16} />
          <span>{savedSuccess ? 'Settings Saved!' : 'Save Settings'}</span>
        </button>
      </form>

      {/* Google Sign In & Firebase Cloud Configuration */}
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cloud size={18} color="var(--accent-primary)" />
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Google Sign-In & Firebase</h4>
          </div>
          <span className="badge badge-lunch" style={{ fontSize: '11px' }}>
            <ShieldCheck size={12} /> Active
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.5' }}>
          Connected to project: <strong>tiffinflow-shashank</strong>.<br />
          For Google popup to succeed, Firebase requires your domain to be authorized.
        </p>

        {/* Authorized Domain Step */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Current Testing Domain:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <code style={{ fontSize: '13px', color: '#34d399', fontWeight: 700 }}>{currentHost}</code>
            <button 
              type="button" 
              onClick={handleCopyHost}
              className="ios-btn ios-btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              {copiedDomain ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copiedDomain ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Ensure <code>{currentHost}</code> and <code>localhost</code> are in <strong>Firebase Console → Auth → Settings → Authorized Domains</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowFirebaseModal(true)}
            className="ios-btn ios-btn-secondary"
            style={{ flex: 1, fontSize: '12px', padding: '10px' }}
          >
            <Key size={14} />
            <span>Configure Firebase Keys</span>
          </button>

          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-btn ios-btn-secondary"
            style={{ textDecoration: 'none', fontSize: '12px', padding: '10px 14px' }}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* iOS App Installation Guide */}
      <div className="ios-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <Smartphone size={20} color="var(--accent-primary)" />
          <h4 style={{ fontSize: '15px', fontWeight: 700 }}>How to Install on iPhone</h4>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          1. Open this website URL in <strong>Safari on your iPhone</strong>.<br />
          2. Tap the <strong>Share</strong> button (box with an upward arrow at the bottom).<br />
          3. Scroll down and tap <strong>"Add to Home Screen"</strong>.<br />
          4. The app icon will appear right on your iPhone home screen with native full-screen experience and offline caching!
        </p>
      </div>

      {/* Cloud Sync & Reset */}
      <div className="ios-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Demo Data</h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Reset local storage to starter demo plan (30-day package with delivered and carried-over days).
        </p>

        <button 
          onClick={onResetData}
          className="ios-btn ios-btn-secondary" 
          style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px' }}
        >
          <RefreshCw size={14} />
          <span>Reset to Demo Sample Data</span>
        </button>
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
                onClick={handleResetToDefaultFirebase}
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
                {fbSaveSuccess ? 'Saved!' : 'Save & Reload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
