import React, { useState, useEffect } from 'react';
import { MultiFactorResolver, User } from 'firebase/auth';
import { sendMfaSmsCode, submitMfaVerificationCode } from '../../services/firebase';
import { Smartphone, ShieldCheck, X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface MfaModalProps {
  resolver: MultiFactorResolver;
  onSuccess: (user: User) => void;
  onClose: () => void;
}

export const MfaModal: React.FC<MfaModalProps> = ({
  resolver,
  onSuccess,
  onClose,
}) => {
  const [verificationId, setVerificationId] = useState<string>('');
  const [hintPhone, setHintPhone] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Send the SMS verification code upon modal mount
  const handleSendCode = async () => {
    setIsSending(true);
    setError(null);
    try {
      const { verificationId: id, hintPhone: phone } = await sendMfaSmsCode(
        resolver,
        'recaptcha-container'
      );
      setVerificationId(id);
      setHintPhone(phone);
    } catch (err: any) {
      console.error('Error sending SMS MFA code:', err);
      setError(err.message || 'Failed to send SMS code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    handleSendCode();
  }, [resolver]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationId || code.length < 6) return;

    setIsVerifying(true);
    setError(null);
    try {
      const user = await submitMfaVerificationCode(resolver, verificationId, code.trim());
      onSuccess(user);
    } catch (err: any) {
      console.error('MFA Verification failed:', err);
      setError(err.message || 'Invalid SMS code. Please check and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        {/* Hidden reCAPTCHA anchor required by Firebase for SMS */}
        <div id="recaptcha-container" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px', borderRadius: '50%' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Security Verification</div>
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>2-Step SMS Verification</h3>
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

        {isSending ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <RefreshCw size={28} className="spin-animation" color="var(--accent-primary)" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sending 6-digit SMS code to your phone...
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerify}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Smartphone size={24} color="#34d399" />
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SMS sent to:</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {hintPhone || 'Your phone number'}
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div className="ios-input-group">
              <label className="ios-label">Enter 6-Digit SMS Code</label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
                className="ios-input"
                style={{
                  fontSize: '24px',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={code.length < 6 || isVerifying}
              className="ios-btn ios-btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                opacity: code.length < 6 || isVerifying ? 0.6 : 1,
              }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Verify & Sign In</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isSending}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Didn't receive code? Resend SMS
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
