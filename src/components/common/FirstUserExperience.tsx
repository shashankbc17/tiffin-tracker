import React from 'react';
import { Sparkles, Calendar, FastForward, MessageSquare, HelpCircle, ArrowRight, ShieldCheck, PlayCircle } from 'lucide-react';

interface FirstUserExperienceProps {
  onOpenNewPackage: () => void;
  onOpenGuide?: () => void;
  onLoadSampleData?: () => void;
}

export const FirstUserExperience: React.FC<FirstUserExperienceProps> = ({
  onOpenNewPackage,
  onOpenGuide,
  onLoadSampleData,
}) => {
  return (
    <div
      className="ios-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingBottom: '20px',
      }}
    >
      {/* Hero Welcome Card */}
      <div
        className="ios-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '28px 20px 24px',
          background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.18) 0%, rgba(139, 92, 246, 0.12) 50%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
          textAlign: 'center',
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* iOS Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={13} />
            <span>Welcome to TiffinFlow</span>
          </div>

          {/* App Title & Tagline */}
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              lineHeight: 1.25,
              color: 'var(--text-primary)',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}
          >
            Smart Tiffin &amp; Meal Subscription Tracker
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: '0 auto 22px',
              maxWidth: '380px',
            }}
          >
            Never lose track of paid meals, cook leaves, and carry-overs. Set up your meal subscription in 30 seconds.
          </p>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onOpenNewPackage}
            className="ios-btn ios-btn-primary"
            style={{
              width: '100%',
              maxWidth: '320px',
              margin: '0 auto',
              padding: '14px 22px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <Sparkles size={18} />
            <span>Create Your First Meal Plan</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      {/* 3 Step Visual Feature Guide */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', paddingLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          How TiffinFlow Simplifies Your Life
        </div>

        {/* Feature 1 */}
        <div
          className="ios-card"
          style={{
            padding: '16px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.16)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            🍱
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              1. Flexible Meal Subscriptions
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Set package duration (e.g. 30 days), custom rates for breakfast &amp; lunch, and active delivery days (like Mon-Sat).
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div
          className="ios-card"
          style={{
            padding: '16px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.16)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            🔄
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              2. Smart Automatic Carry-Overs
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Cook takes a leave or you go out? Mark skipped in 1 tap. TiffinFlow automatically pushes your subscription end date forward so you never lose paid meals.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div
          className="ios-card"
          style={{
            padding: '16px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.16)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            💬
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              3. 1-Tap WhatsApp Billing
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Generate clear, itemized monthly statements and share them directly to your cook on WhatsApp with zero disputes.
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Exploratory & Help Options */}
      <div
        className="ios-card"
        style={{
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="#34d399" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Works offline &amp; syncs safely across all your devices
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end', marginTop: '4px' }}>
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <HelpCircle size={14} />
              <span>How It Works Guide</span>
            </button>
          )}

          {onLoadSampleData && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="ios-btn ios-btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#a78bfa',
                borderColor: 'rgba(139, 92, 246, 0.4)',
              }}
              title="Preview with sample demo data"
            >
              <PlayCircle size={14} />
              <span>Explore with Sample Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
