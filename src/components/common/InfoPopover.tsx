import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface InfoPopoverProps {
  title: string;
  content: React.ReactNode;
  size?: number;
  color?: string;
  badgeText?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  title,
  content,
  size = 15,
  color = '#94a3b8',
  badgeText = '!',
  ariaLabel,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        aria-label={ariaLabel || title}
        title={title}
        className="info-popover-trigger"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${size + 5}px`,
          height: `${size + 5}px`,
          borderRadius: '50%',
          border: color ? `1.2px solid ${color}` : undefined,
          color: color || undefined,
          fontSize: `${size - 3}px`,
          fontWeight: 800,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          verticalAlign: 'middle',
          ...style,
        }}
      >
        {badgeText}
      </button>

      {isOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box',
            }}
            onClick={() => setIsOpen(false)}
          >
            <div
              className="info-popover-dialog"
              style={{
                width: '100%',
                maxWidth: '400px',
                maxHeight: 'min(520px, 86vh)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                borderRadius: '20px',
                boxShadow: 'var(--glass-shadow), 0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                animation: 'iosModalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--glass-border)',
                  background: 'var(--metric-card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary-subtle)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {badgeText}
                  </div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {title}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="modal-close-icon-btn"
                  title="Close"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Content */}
              <div
                style={{
                  padding: '16px 18px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {typeof content === 'string' ? (
                  <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{content}</p>
                ) : (
                  content
                )}
              </div>

              {/* Footer Dismiss Button */}
              <div
                style={{
                  padding: '10px 18px 14px',
                  borderTop: '1px solid var(--glass-border)',
                  background: 'var(--metric-card-bg)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="ios-btn ios-btn-secondary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
