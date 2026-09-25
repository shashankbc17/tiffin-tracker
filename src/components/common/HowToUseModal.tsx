import React, { useState } from 'react';
import { X, CheckCircle2, FastForward, Clock, Utensils, MessageSquare, Smartphone, HelpCircle, Heart } from 'lucide-react';

interface HowToUseModalProps {
  onClose: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({ onClose }) => {
  const [activeTopic, setActiveTopic] = useState<'daily' | 'auto' | 'menu' | 'carryover' | 'whatsapp' | 'install'>('daily');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-sheet" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="sheet-handle" />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '6px', borderRadius: '50%' }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>
                Simple & Easy Guide
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                How to Use TiffinFlow
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="modal-close-icon-btn"
            title="Close Guide"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Topic Pills for easy scrolling/switching */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '10px', 
            marginBottom: '12px',
            scrollbarWidth: 'none',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTopic('daily')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: activeTopic === 'daily' ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
              background: activeTopic === 'daily' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTopic === 'daily' ? '#34d399' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            ✅ 1-Tap Daily
          </button>

          <button
            type="button"
            onClick={() => setActiveTopic('auto')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: activeTopic === 'auto' ? '1px solid #3b82f6' : '1px solid var(--glass-border)',
              background: activeTopic === 'auto' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTopic === 'auto' ? '#60a5fa' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            ⚡ Auto-Delivered
          </button>

          <button
            type="button"
            onClick={() => setActiveTopic('menu')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: activeTopic === 'menu' ? '1px solid #fbbf24' : '1px solid var(--glass-border)',
              background: activeTopic === 'menu' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTopic === 'menu' ? '#fbbf24' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            🍲 Meal Dishes
          </button>

          <button
            type="button"
            onClick={() => setActiveTopic('carryover')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: activeTopic === 'carryover' ? '1px solid #a78bfa' : '1px solid var(--glass-border)',
              background: activeTopic === 'carryover' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTopic === 'carryover' ? '#c4b5fd' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            ⏭️ Skips &amp; Savings
          </button>

          <button
            type="button"
            onClick={() => setActiveTopic('whatsapp')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: activeTopic === 'whatsapp' ? '1px solid #25D366' : '1px solid var(--glass-border)',
              background: activeTopic === 'whatsapp' ? 'rgba(37, 211, 102, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTopic === 'whatsapp' ? '#34d399' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            💬 WhatsApp
          </button>

          <button
            type="button"
            onClick={() => setActiveTopic('install')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: activeTopic === 'install' ? '1px solid #38bdf8' : '1px solid var(--glass-border)',
              background: activeTopic === 'install' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTopic === 'install' ? '#38bdf8' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            📱 Phone App
          </button>
        </div>

        {/* Content Area */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
          {activeTopic === 'daily' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={20} color="#34d399" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    1. Confirming Meals Today
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                  When your food arrives, tap the green <strong>"Served ✅"</strong> button on the home screen. It immediately records that the meal was received.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                    Breakfast ✅ (Morning)
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                    Lunch ✅ (Afternoon)
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#fbbf24' }}>
                  💡 What if I want to skip?
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Tap <strong>"Skip (Carry)"</strong>. The money or portion for that meal is saved and pushes your plan's end date forward. You never lose money for skipped meals!
                </p>
              </div>
            </div>
          )}

          {activeTopic === 'auto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)', border: '1px solid rgba(59, 130, 246, 0.35)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={20} color="#60a5fa" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Automated Delivery (No Stress!)
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  Forgot to open the app to tap confirm? <strong>No problem at all!</strong> TiffinFlow automatically marks your scheduled meals as delivered after the meal window passes:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>🍳 Breakfast</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Timing: 8:00 AM – 10:30 AM</div>
                    <div style={{ fontSize: '11.5px', color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
                      Auto-marked at 11:00 AM IST
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>🍱 Lunch</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Timing: 12:00 PM – 3:00 PM</div>
                    <div style={{ fontSize: '11.5px', color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
                      Auto-marked at 3:00 PM IST
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#c4b5fd' }}>
                  ✨ You can still edit, skip, or change portions anytime by tapping on that date on the calendar!
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'menu' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Utensils size={20} color="#fbbf24" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Recording What Was Sent (Dishes / Menu)
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                  Ever wonder: <em>"What did we have for lunch last Tuesday?"</em> or need to verify a meal with the caterer?
                </p>
                <ol style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, paddingLeft: '20px' }}>
                  <li>Tap on any day in the Calendar or tap <strong>"More..."</strong> today.</li>
                  <li>Type what was delivered in <strong>"Breakfast Dish"</strong> (e.g. <em>"Poha, Chai"</em>) or <strong>"Lunch Dish"</strong> (e.g. <em>"Dal Roti Sabzi"</em>).</li>
                  <li>Tap <strong>"Confirm &amp; Save"</strong>.</li>
                  <li>It will now be saved and visible in your Activity Logs!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTopic === 'carryover' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FastForward size={20} color="#a78bfa" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Smart Carry-Over &amp; Skips
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                  Whenever you skip a day or the cook takes leave (Cook Holiday):
                </p>
                <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, paddingLeft: '20px' }}>
                  <li>Your package <strong>never expires early</strong>.</li>
                  <li>The end date pushes forward across delivery days (e.g. valid till 28th instead of 25th).</li>
                  <li>In the <strong>"Statement"</strong> tab, you can see exactly how many days and rupees were saved!</li>
                </ul>
              </div>
            </div>
          )}

          {activeTopic === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(37, 211, 102, 0.12)', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MessageSquare size={20} color="#25D366" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Sending Statement to Cook / Caterer
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                  At the end of the week or month, you don't have to manually calculate days or dispute with your cook:
                </p>
                <ol style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, paddingLeft: '20px' }}>
                  <li>Tap the <strong>"Statement"</strong> tab at the bottom.</li>
                  <li>Tap <strong>"Send to Cook"</strong> (Green WhatsApp button).</li>
                  <li>WhatsApp will open with a ready-made, professional statement showing: total days served, skips carried over, remaining days, and total amount!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTopic === 'install' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Smartphone size={20} color="#38bdf8" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Install on Phone Home Screen
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  Open TiffinFlow with 1 touch from your phone just like a regular app:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8', marginBottom: '4px' }}>
                      🍎 On iPhone (Safari):
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      1. Open Safari.<br />
                      2. Tap the <strong>Share</strong> button (the square with arrow pointing up).<br />
                      3. Tap <strong>"Add to Home Screen"</strong>.<br />
                      4. Tap <strong>"Add"</strong> at top right. Now it has its own app icon on your phone!
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#34d399', marginBottom: '4px' }}>
                      🤖 On Android (Chrome):
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      1. Open Chrome.<br />
                      2. Tap the <strong>3 vertical dots (⋮)</strong> at top right.<br />
                      3. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Friendly footer for parents & grandparents */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
            <Heart size={14} color="#f43f5e" />
            <span>Designed for the whole family to use easily!</span>
          </div>
        </div>

        {/* Close button */}
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--glass-border)' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="ios-btn ios-btn-primary" 
            style={{ width: '100%', fontSize: '14px', padding: '12px' }}
          >
            Got It! Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
