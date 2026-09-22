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
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${size + 5}px`,
          height: `${size + 5}px`,
          borderRadius: '50%',
          border: `1.2px solid ${color}`,
          background: 'rgba(255, 255, 255, 0.06)',
          color: color,
          fontSize: `${size - 3}px`,
          fontWeight: 800,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          transition: 'all 0.15s ease',
          verticalAlign: 'middle',
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
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
              backgroundColor: 'rgba(0, 0, 0, 0.78)',
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
              style={{
                width: '100%',
                maxWidth: '380px',
                maxHeight: 'min(520px, 86vh)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#131b2e',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                overflow: 'hidden',
                animation: 'iosModalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.04)',
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
                      background: `${color}25`,
                      color: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {badgeText}
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {title}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Content */}
              <div
                style={{
                  padding: '16px 18px',
                  fontSize: '13px',
                  color: 'var(--text-secondary, #94a3b8)',
                  lineHeight: 1.55,
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
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  background: 'rgba(255, 255, 255, 0.02)',
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
                    padding: '8px 18px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-full, 9999px)',
                    cursor: 'pointer',
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
