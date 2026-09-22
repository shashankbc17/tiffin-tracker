import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

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

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#131b2e',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-lg, 20px)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
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
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
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
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div
              style={{
                padding: '16px 18px',
                fontSize: '13px',
                color: 'var(--text-secondary, #94a3b8)',
                lineHeight: 1.55,
                maxHeight: '70vh',
                overflowY: 'auto',
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
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ios-btn ios-btn-secondary"
                style={{ padding: '7px 16px', fontSize: '12px', borderRadius: 'var(--radius-full, 9999px)' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
