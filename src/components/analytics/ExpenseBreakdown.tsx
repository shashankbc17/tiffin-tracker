import React, { useState } from 'react';
import { CarryOverStats, RateConfig, PackagePlan, DayRecord } from '../../types';
import { generateWhatsAppSummary } from '../../services/carryOverEngine';
import { Share2, Copy, Check, MessageSquare, TrendingDown, DollarSign, Calendar } from 'lucide-react';

interface ExpenseBreakdownProps {
  stats: CarryOverStats;
  config: RateConfig;
  activePackage: PackagePlan | null;
  records: Record<string, DayRecord>;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  stats,
  config,
  activePackage,
  records,
}) => {
  const currency = config.currency || '₹';
  const [copied, setCopied] = useState(false);

  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const summaryText = generateWhatsAppSummary(currentMonthName, activePackage, stats, config);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const phone = config.catererPhone ? config.catererPhone.replace(/[^0-9]/g, '') : '';
    const encoded = encodeURIComponent(summaryText);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Recent 10 recorded dates sorted reverse
  const recentDates = Object.keys(records).sort().reverse().slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Total Spent Hero Banner with Anime Wealth Icon */}
      <div className="ios-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)', borderColor: 'rgba(16, 185, 129, 0.35)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-block', marginBottom: '6px' }}>
              💰 Financial Analytics & Savings
            </span>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Total Value Consumed
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#34d399', margin: '2px 0 6px 0' }}>
              {currency}{stats.totalSpent.toLocaleString()}
            </div>
            <div style={{ fontSize: '11.5px', color: '#c4b5fd' }}>
              ✨ Saved {currency}{stats.carriedOverValue} through {stats.carryOverDays} carried-over skips!
            </div>
          </div>

          <div style={{ width: '64px', height: '64px', borderRadius: '18px', overflow: 'hidden', flexShrink: 0, border: '2px solid #fbbf24', boxShadow: '0 4px 14px rgba(251, 191, 36, 0.3)' }}>
            <img src="./assets/anime_analytics.jpg" alt="Nezuko Savings" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid var(--glass-border)', fontSize: '12px' }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            🍳 Breakfasts: <strong style={{ color: '#fbbf24' }}>{stats.breakfastDelivered}</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            🍱 Lunches: <strong style={{ color: '#34d399' }}>{stats.lunchDelivered}</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            ⏭️ Carried Over: <strong style={{ color: '#c4b5fd' }}>{stats.carryOverDays} days</strong>
          </div>
        </div>
      </div>

      {/* WhatsApp Summary Generator Card */}
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#25D366" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>WhatsApp Statement</h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>To {config.catererName || 'Cook'}</span>
        </div>

        <div 
          style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: 'var(--radius-sm)', 
            padding: '12px', 
            fontSize: '12px', 
            fontFamily: 'monospace', 
            whiteSpace: 'pre-line',
            color: 'var(--text-secondary)',
            maxHeight: '160px',
            overflowY: 'auto',
            marginBottom: '14px',
            userSelect: 'text'
          }}
        >
          {summaryText}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button 
            onClick={handleCopy} 
            className="ios-btn ios-btn-secondary" 
            style={{ fontSize: '13px', padding: '10px 12px' }}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button 
            onClick={handleWhatsAppShare} 
            className="ios-btn ios-btn-whatsapp" 
            style={{ fontSize: '13px', padding: '10px 12px' }}
          >
            <Share2 size={16} />
            <span>Send to Cook</span>
          </button>
        </div>
      </div>

      {/* Recent History Feed */}
      <div className="ios-card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="var(--text-muted)" />
          <span>Recent Activity Logs</span>
        </h3>

        {recentDates.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
            No meal logs recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentDates.map((dateStr) => {
              const rec = records[dateStr];
              const bStat = rec.breakfast?.status || 'none';
              const lStat = rec.lunch?.status || 'none';
              return (
                <div 
                  key={dateStr}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{dateStr}</div>
                    {rec.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rec.notes}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span 
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: bStat === 'delivered' ? 'var(--accent-breakfast-subtle)' : bStat === 'skipped' ? 'var(--accent-carryover-subtle)' : 'rgba(255,255,255,0.05)',
                        color: bStat === 'delivered' ? '#fbbf24' : bStat === 'skipped' ? '#c4b5fd' : 'var(--text-muted)'
                      }}
                    >
                      B: {bStat}
                    </span>

                    <span 
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: lStat === 'delivered' ? 'var(--accent-lunch-subtle)' : lStat === 'skipped' ? 'var(--accent-carryover-subtle)' : 'rgba(255,255,255,0.05)',
                        color: lStat === 'delivered' ? '#34d399' : lStat === 'skipped' ? '#c4b5fd' : 'var(--text-muted)'
                      }}
                    >
                      L: {lStat}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
