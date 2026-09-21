import React, { useState } from 'react';
import { CarryOverStats, RateConfig, PackagePlan, DayRecord } from '../../types';
import { generateWhatsAppSummary } from '../../services/carryOverEngine';
import { Share2, Copy, Check, MessageSquare, Calendar, ChevronDown, ChevronUp, Edit2, Coffee, Utensils } from 'lucide-react';

interface ExpenseBreakdownProps {
  stats: CarryOverStats;
  config: RateConfig;
  activePackage: PackagePlan | null;
  records: Record<string, DayRecord>;
  onOpenDayDetails?: (dateStr: string) => void;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  stats,
  config,
  activePackage,
  records,
  onOpenDayDetails,
}) => {
  const currency = config.currency || '₹';
  const [copied, setCopied] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

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

  const toggleExpand = (dateStr: string) => {
    setExpandedDate(expandedDate === dateStr ? null : dateStr);
  };

  // Recent 15 recorded dates sorted reverse
  const recentDates = Object.keys(records).sort().reverse().slice(0, 15);

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

      {/* Minimal Activity Logs with Click-to-Expand Details */}
      <div className="ios-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Calendar size={16} color="var(--text-muted)" />
            <span>Activity Logs</span>
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap any row for dish &amp; person details</span>
        </div>

        {recentDates.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
            No meal logs recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentDates.map((dateStr) => {
              const rec = records[dateStr];
              const isExpanded = expandedDate === dateStr;

              const bStat = rec.breakfast?.status || 'none';
              const lStat = rec.lunch?.status || 'none';
              const bPersons = rec.breakfast?.persons || 1;
              const lPersons = rec.lunch?.persons || 1;

              const dateObj = new Date(dateStr + 'T00:00:00');
              const formattedRowDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div 
                  key={dateStr}
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    background: isExpanded ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.025)',
                    border: isExpanded ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Minimal Row (Clickable) */}
                  <div
                    onClick={() => toggleExpand(dateStr)}
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      cursor: 'pointer',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                        {formattedRowDate}
                      </span>
                      {rec.isCookOff && (
                        <span style={{ fontSize: '10px', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                          🏖️ Cook Off
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Compact Breakfast Badge */}
                      {bStat !== 'none' && (
                        <span 
                          style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: bStat === 'delivered' ? 'rgba(251, 191, 36, 0.18)' : bStat === 'skipped' ? 'var(--accent-carryover-subtle)' : 'rgba(255,255,255,0.05)',
                            color: bStat === 'delivered' ? '#fbbf24' : bStat === 'skipped' ? '#c4b5fd' : 'var(--text-muted)'
                          }}
                        >
                          🍳 {bStat === 'delivered' ? `${bPersons}p` : bStat === 'skipped' ? 'Skip' : bStat}
                        </span>
                      )}

                      {/* Compact Lunch Badge */}
                      {lStat !== 'none' && (
                        <span 
                          style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: lStat === 'delivered' ? 'rgba(16, 185, 129, 0.18)' : lStat === 'skipped' ? 'var(--accent-carryover-subtle)' : 'rgba(255,255,255,0.05)',
                            color: lStat === 'delivered' ? '#34d399' : lStat === 'skipped' ? '#c4b5fd' : 'var(--text-muted)'
                          }}
                        >
                          🍱 {lStat === 'delivered' ? `${lPersons}p` : lStat === 'skipped' ? 'Skip' : lStat}
                        </span>
                      )}

                      {isExpanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Expanded Full Details */}
                  {isExpanded && (
                    <div 
                      style={{ 
                        padding: '10px 12px 12px 12px', 
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        background: 'rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontSize: '11.5px'
                      }}
                    >
                      {/* Breakfast Detail */}
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Coffee size={12} /> Breakfast: {bStat.toUpperCase()}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {bPersons} Person(s) · {currency}{rec.breakfast?.rate || config.defaultBreakfastRate}/p
                          </span>
                        </div>
                        <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                          🍲 <strong>Dish / Sent:</strong> {rec.breakfast?.menuItem || <span style={{ color: 'var(--text-muted)' }}>No dish noted</span>}
                        </div>
                        {rec.breakfast?.autoDelivered && (
                          <div style={{ marginTop: '3px', color: '#60a5fa', fontSize: '10.5px' }}>
                            ⚡ Auto-marked delivered after 11:00 AM IST cutoff
                          </div>
                        )}
                      </div>

                      {/* Lunch Detail */}
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Utensils size={12} /> Lunch: {lStat.toUpperCase()}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {lPersons} Person(s) · {currency}{rec.lunch?.rate || config.defaultLunchRate}/p
                          </span>
                        </div>
                        <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                          🍲 <strong>Dish / Sent:</strong> {rec.lunch?.menuItem || <span style={{ color: 'var(--text-muted)' }}>No dish noted</span>}
                        </div>
                        {rec.lunch?.autoDelivered && (
                          <div style={{ marginTop: '3px', color: '#60a5fa', fontSize: '10.5px' }}>
                            ⚡ Auto-marked delivered after 3:00 PM IST cutoff
                          </div>
                        )}
                      </div>

                      {/* Day Note & Edit Action */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          {rec.notes ? `Note: ${rec.notes}` : ''}
                        </div>
                        {onOpenDayDetails && (
                          <button
                            type="button"
                            onClick={() => onOpenDayDetails(dateStr)}
                            className="ios-btn ios-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Edit2 size={11} />
                            <span>Edit Record</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

