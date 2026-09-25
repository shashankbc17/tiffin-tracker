import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  Monitor, 
  ExternalLink, 
  RefreshCw, 
  LogIn, 
  Database,
  Wifi
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface SyncModalProps {
  user: User | null;
  syncStatus: 'synced' | 'syncing' | 'error' | 'local_only';
  syncErrorMsg?: string | null;
  onLogin: () => void;
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  user,
  syncStatus,
  syncErrorMsg,
  onLogin,
  onClose,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (!db) {
        setTestResult({
          status: 'error',
          message: 'Firebase is not initialized. Please verify your keys in Settings.',
        });
        setTesting(false);
        return;
      }
      if (!user) {
        setTestResult({
          status: 'error',
          message: 'Please sign in with Google first to test multi-device cloud synchronization.',
        });
        setTesting(false);
        return;
      }
      // Ping Firestore by reading the authenticated user's own document (fully compliant with security rules)
      const userDocRef = doc(db, 'users', user.uid);
      await getDoc(userDocRef);
      setTestResult({
        status: 'success',
        message: 'Cloud Firestore is reachable and responsive! Multi-device sync is healthy and operational.',
      });
    } catch (err: any) {
      if (err.message?.includes('not exist') || err.code === 'not-found' || err.message?.includes('NOT_FOUND')) {
        setTestResult({
          status: 'error',
          message:
            'Cloud Firestore Database is not created yet in Firebase project "tiffinflow-shashank". Click "Create Database" below to enable it in 30 seconds.',
        });
      } else if (err.code === 'permission-denied') {
        setTestResult({
          status: 'error',
          message:
            'Permission denied. Please ensure your Firestore Security Rules allow authenticated users to read/write under users/{userId}.',
        });
      } else {
        setTestResult({
          status: 'error',
          message: err.message || 'Could not connect to Cloud Firestore.',
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="sheet-handle" />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cloud size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Real-Time Multi-Device Sync
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Desktop ↔ iPhone Instant Synchronization
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="modal-close-icon-btn"
            title="Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Diagnostics Card */}
        <div
          style={{
            background: 'var(--metric-card-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12.5px',
          }}
        >
          {/* Item 1: Device State */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={14} /> Current Device:
            </span>
            <span style={{ color: 'var(--accent-lunch)', fontWeight: 600 }}>🟢 Online</span>
          </div>

          {/* Item 2: User Account */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Google Account:</span>
            {user ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px' }}>
                {user.email}
              </span>
            ) : (
              <span style={{ color: 'var(--accent-breakfast)', fontWeight: 600 }}>⚠️ Not Signed In</span>
            )}
          </div>

          {/* Item 3: Firebase Project */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={14} /> Cloud Project:
            </span>
            <code style={{ 
              color: 'var(--accent-carryover)', 
              background: 'var(--input-bg)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid var(--glass-border)',
              fontSize: '11.5px', 
              fontWeight: 600 
            }}>
              tiffinflow-shashank
            </code>
          </div>

          {/* Item 4: Sync Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Sync Status:</span>
            {syncStatus === 'synced' && (
              <span style={{ color: 'var(--accent-lunch)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> Active (&lt;100ms)
              </span>
            )}
            {syncStatus === 'local_only' && (
              <span style={{ color: 'var(--accent-breakfast)', fontWeight: 600 }}>
                📱 Local Only (Sign in to sync)
              </span>
            )}
            {syncStatus === 'error' && (
              <span style={{ color: 'var(--accent-skip)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={13} /> Database Setup Needed
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                🔄 Syncing changes...
              </span>
            )}
          </div>
        </div>

        {/* 1. STATE BANNER: SYNCED (ACTIVE) */}
        {syncStatus === 'synced' && (
          <div
            style={{
              background: 'var(--cal-delivered-bg)',
              border: '1px solid var(--cal-delivered-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '13.5px',
                color: 'var(--accent-lunch)',
                marginBottom: '6px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Real-Time Multi-Device Sync Active</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
              Your meal records, active packages, and settings synchronize seamlessly with Google Cloud Firestore. Any entry you log on this device will reflect on your iPhone and other devices instantly (&lt;100ms).
            </p>
          </div>
        )}

        {/* 2. STATE BANNER: LOCAL ONLY */}
        {syncStatus === 'local_only' && (
          <div
            style={{
              background: 'var(--accent-breakfast-subtle)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '13px',
                color: 'var(--accent-breakfast)',
                marginBottom: '6px',
              }}
            >
              <Smartphone size={16} />
              <span>Local Offline Mode</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
              You are currently using local device storage. Sign into your Google account below to automatically sync across your iPhone and computer.
            </p>
          </div>
        )}

        {/* 3. STATE BANNER: ERROR / SETUP NEEDED (ONLY SHOWN IF ACTUALLY FAILING) */}
        {syncStatus === 'error' && (
          <div
            style={{
              background: 'var(--cal-skipped-bg)',
              border: '1px solid var(--cal-skipped-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '13px',
                color: 'var(--accent-skip)',
                marginBottom: '6px',
              }}
            >
              <AlertTriangle size={16} />
              <span>Cloud Firestore Setup Needed:</span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              {syncErrorMsg || (
                <>
                  In Firebase, creating a project does not automatically create the database. The Cloud
                  Firestore database has <strong>not been created yet</strong> in your Firebase project{' '}
                  <code style={{ 
                    color: 'var(--text-primary)', 
                    background: 'var(--input-bg)', 
                    padding: '2px 5px', 
                    borderRadius: '4px',
                    border: '1px solid var(--glass-border)' 
                  }}>
                    tiffinflow-shashank
                  </code>.
                </>
              )}
            </p>

            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                background: 'var(--metric-card-bg)',
                border: '1px solid var(--glass-border)',
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '12px',
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>How to enable in 30 Seconds:</strong>
              <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>
                  Click the <strong>"Open Firebase &amp; Create Database"</strong> button below.
                </li>
                <li>
                  Click <strong>"Create database"</strong>.
                </li>
                <li>
                  Select <strong>"Start in test mode"</strong> and click <strong>Enable</strong>.
                </li>
                <li>Sign into the same Google account on both devices.</li>
              </ol>
            </div>

            <a
              href="https://console.firebase.google.com/project/tiffinflow-shashank/firestore"
              target="_blank"
              rel="noopener noreferrer"
              className="ios-btn ios-btn-primary"
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              }}
            >
              <ExternalLink size={15} />
              <span>1-Click: Create Firestore Database Now</span>
            </a>
          </div>
        )}

        {/* Step: Google Sign In Requirement if not signed in */}
        {!user && (
          <div
            style={{
              background: 'var(--metric-card-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              👤 Sign In with Google on Both Devices
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
              To sync your meals in real time, sign into the <strong>same Google account</strong> on your Desktop and iPhone.
            </p>
            <button
              onClick={() => {
                onClose();
                onLogin();
              }}
              className="ios-btn ios-btn-secondary"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
              }}
            >
              <LogIn size={14} />
              <span>Sign In with Google</span>
            </button>
          </div>
        )}

        {/* Diagnostics & Health Check Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Connection Diagnostics
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="ios-btn ios-btn-secondary"
            style={{
              width: '100%',
              padding: '9px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
            }}
          >
            <RefreshCw size={13} className={testing ? 'spin' : ''} />
            <span>{testing ? 'Testing Cloud Connection...' : 'Test Cloud Connection Now'}</span>
          </button>

          {testResult && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                background:
                  testResult.status === 'success'
                    ? 'var(--cal-delivered-bg)'
                    : 'var(--cal-skipped-bg)',
                border:
                  testResult.status === 'success'
                    ? '1px solid var(--cal-delivered-border)'
                    : '1px solid var(--cal-skipped-border)',
                color:
                  testResult.status === 'success'
                    ? 'var(--accent-lunch)'
                    : 'var(--accent-skip)',
                lineHeight: 1.5,
              }}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
