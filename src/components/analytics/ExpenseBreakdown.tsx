import React, { useState } from 'react';
import { CarryOverStats, RateConfig, PackagePlan, DayRecord } from '../../types';
import {
  generateMonthlyWhatsAppSummary,
  calculateMonthlyStats,
  getLast6Months,
  getIstNow,
  addDays,
} from '../../services/carryOverEngine';
import {
  Share2,
  Copy,
  Check,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Coffee,
  Utensils,
  History,
  Clock,
  Sparkles,
  CalendarDays,
  FileText,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { StatementExportModal } from './StatementExportModal';
import { InfoPopover } from '../common/InfoPopover';

interface ExpenseBreakdownProps {
  stats: CarryOverStats;
  config: RateConfig;
  activePackage: PackagePlan | null;
  records: Record<string, DayRecord>;
  onOpenDayDetails?: (dateStr: string) => void;
  onOpenStatementModal?: (monthKey?: string) => void;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  stats,
  config,
  activePackage,
  records,
  onOpenDayDetails,
  onOpenStatementModal,
}) => {
  const currency = config.currency || '₹';
  const { dateStr: todayStr } = getIstNow();
  const oneMonthAgoStr = addDays(todayStr, -30);

  // Check meal types included in active package
  const isPlanIncludesBf = activePackage ? activePackage.includesBreakfast !== false : true;
  const isPlanIncludesLunch = activePackage ? activePackage.includesLunch !== false : true;

  const [copied, setCopied] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const handleOpenExtractModal = () => {
    if (onOpenStatementModal) {
      onOpenStatementModal(selectedMonthKey);
    } else {
      setIsStatementModalOpen(true);
    }
  };

  // 6 Months History Selector (counts back up to 6 months from current month)
  const monthOptions = getLast6Months(6);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    monthOptions[0]?.key || todayStr.slice(0, 7)
  );

  // Edit Past History state: strictly limited to within 1 month (30 days ago to today)
  const defaultPastDate = addDays(todayStr, -1);
  const [pastEditDate, setPastEditDate] = useState<string>(defaultPastDate);

  // Calculate monthly stats for the selected month
  const monthlyStats = calculateMonthlyStats(selectedMonthKey, records, activePackage, config);

  // Filter dates strictly for the selected month, sorted newest first
  const monthDates = Object.keys(records)
    .filter((d) => d.startsWith(selectedMonthKey))
    .sort()
    .reverse();

  // Monthly WhatsApp statement text
  const monthlySummaryText = generateMonthlyWhatsAppSummary(monthlyStats, activePackage, config);

  const handleCopy = () => {
    navigator.clipboard.writeText(monthlySummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    let phone = config.catererPhone ? config.catererPhone.replace(/[^0-9]/g, '') : '';
    if (phone && phone.length === 10) {
      phone = `91${phone}`;
    }
    const encoded = encodeURIComponent(monthlySummaryText);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const toggleExpand = (dateStr: string) => {
    setExpandedDate(expandedDate === dateStr ? null : dateStr);
  };

  // Quick past date presets (clamped to 30 days)
  const setPastPreset = (daysAgo: number) => {
    const target = addDays(todayStr, -daysAgo);
    if (target >= oneMonthAgoStr && target <= todayStr) {
      setPastEditDate(target);
    }
  };

  // Preview record for pastEditDate
  const pastRec = records[pastEditDate];
  const pastBStat = pastRec?.breakfast?.status || 'none';
  const pastLStat = pastRec?.lunch?.status || 'none';
  const hasPastRecord = Boolean(
    pastRec && (pastBStat !== 'none' || pastLStat !== 'none' || pastRec.isCookOff)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. SEPARATE SECTION: Edit Past History (Only visible when a plan is active) */}
      {Boolean(activePackage && activePackage.status === 'active') && (
        <div
          className="ios-card"
          style={{
            border: '1px solid rgba(139, 92, 246, 0.35)',
            background:
              'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
          }}
        >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f8fafc',
                margin: 0,
              }}
            >
              <History size={16} color="#c4b5fd" />
              <span>Edit Past History</span>
            </h3>
            <InfoPopover
              title="Edit Past History"
              color="#c4b5fd"
              content="Select any date within the past 30 days to update delivered meals, portions, custom dish names, or skips so they reflect accurately in your billing logs."
            />
          </div>
          <span
            style={{
              fontSize: '10.5px',
              color: '#c4b5fd',
              background: 'rgba(139, 92, 246, 0.18)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
            }}
          >
            Past 30 Days
          </span>
        </div>

        {/* Quick Date Presets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
          {[
            { label: 'Yesterday', days: 1 },
            { label: '2 Days Ago', days: 2 },
            { label: '3 Days Ago', days: 3 },
            { label: '1 Wk Ago', days: 7 },
          ].map((preset) => {
            const isPresetActive = pastEditDate === addDays(todayStr, -preset.days);
            return (
              <button
                key={preset.days}
                type="button"
                onClick={() => setPastPreset(preset.days)}
                style={{
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: isPresetActive
                    ? '1px solid #8b5cf6'
                    : '1px solid var(--glass-border)',
                  background: isPresetActive
                    ? 'rgba(139, 92, 246, 0.25)'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isPresetActive ? '#ddd6fe' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Date input strictly constrained between [today - 30 days] and [today] */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Select Past Date:
            </label>
            <InfoPopover
              title="30-Day Window Limit"
              color="#c4b5fd"
              size={13}
              content={`Allowed range: ${oneMonthAgoStr} (30 days ago) to ${todayStr} (today). Future dates and dates older than 30 days cannot be modified.`}
            />
          </div>
          <input
            type="date"
            className="ios-input"
            value={pastEditDate}
            min={oneMonthAgoStr}
            max={todayStr}
            onChange={(e) => {
              const val = e.target.value;
              if (val > todayStr) {
                alert(`Cannot select future dates (${val}) for past history editing. Clamped to today (${todayStr}).`);
                setPastEditDate(todayStr);
                return;
              }
              if (val < oneMonthAgoStr) {
                alert(`Cannot select dates older than 1 month (${oneMonthAgoStr}). Clamped to ${oneMonthAgoStr}.`);
                setPastEditDate(oneMonthAgoStr);
                return;
              }
              setPastEditDate(val);
            }}
            style={{ padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Status card preview for the selected past date */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            marginTop: '10px',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
              📅{' '}
              {new Date(pastEditDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {hasPastRecord ? (
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                ✓ Record Found
              </span>
            ) : (
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.15)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                Not Logged Yet
              </span>
            )}
          </div>

          {hasPastRecord ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
              {pastRec?.isCookOff ? (
                <span style={{ color: '#f87171', fontWeight: 600 }}>🏖️ Cook Off Day</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {pastBStat !== 'none' && (isPlanIncludesBf || pastBStat === 'extra') && (
                    <div>
                      🍳 Breakfast:{' '}
                      <strong style={{ color: pastBStat === 'delivered' ? '#fbbf24' : '#c4b5fd' }}>
                        {pastBStat}
                      </strong>
                      {pastRec?.breakfast?.menuItem && (
                        <span style={{ color: '#94a3b8' }}> — {pastRec.breakfast.menuItem}</span>
                      )}
                    </div>
                  )}
                  {pastLStat !== 'none' && (isPlanIncludesLunch || pastLStat === 'extra') && (
                    <div>
                      🍱 Lunch:{' '}
                      <strong style={{ color: pastLStat === 'delivered' ? '#34d399' : '#c4b5fd' }}>
                        {pastLStat}
                      </strong>
                      {pastRec?.lunch?.menuItem && (
                        <span style={{ color: '#94a3b8' }}> — {pastRec.lunch.menuItem}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              No entry recorded for this date. Tap the button below to add delivered dishes or skips.
            </div>
          )}
        </div>

        {/* Action Button: Opens DayDetailModal */}
        {onOpenDayDetails && (
          <button
            type="button"
            onClick={() => {
              if (pastEditDate > todayStr) {
                alert(`Cannot edit future dates in past history. Max allowed date is today (${todayStr}).`);
                return;
              }
              onOpenDayDetails(pastEditDate);
            }}
            className="ios-btn ios-btn-primary"
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '10px 14px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Edit2 size={15} />
            <span>
              {hasPastRecord ? `Edit Record for ${pastEditDate} 📝` : `Log Meals for ${pastEditDate} ➕`}
            </span>
          </button>
        )}
      </div>
      )}

      {/* 2. 6-MONTH HISTORY MONTH SELECTOR */}
      <div className="ios-card" style={{ padding: '12px 14px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#f8fafc',
            }}
          >
            <Calendar size={14} color="var(--accent-primary)" />
            <span>Monthly Reports (Up to 6 Months in Past)</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {monthDates.length} logs in {monthlyStats.monthLabel.split(' ')[0]}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
        >
          {monthOptions.map((m) => {
            const isSelected = selectedMonthKey === m.key;
            const countInMonth = Object.keys(records).filter((d) => d.startsWith(m.key)).length;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setSelectedMonthKey(m.key);
                  setExpandedDate(null);
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid #10b981' : '1px solid var(--glass-border)',
                  background: isSelected
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span>{m.label}</span>
                {countInMonth > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-full)',
                      background: isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#090d16' : 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {countInMonth}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MONTHLY REPORT SUMMARY BANNER FOR SELECTED MONTH */}
      <div
        className="ios-card"
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.35)',
          position: 'relative',
          overflow: 'hidden',
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: '#34d399',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                📊 Monthly Summary · {monthlyStats.monthLabel}
              </span>
              <InfoPopover
                title={`Monthly Summary for ${monthlyStats.monthLabel}`}
                color="#34d399"
                content={
                  <div>
                    <div>Consolidated billing and consumption metrics for {monthlyStats.monthLabel}:</div>
                    <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                      • <strong>Consumed Value:</strong> Total debited for served meals.<br />
                      • <strong>Carry-over Savings:</strong> Value preserved when meals were skipped or cook was off.<br />
                      • <strong>Portions:</strong> Exact count of delivered breakfast and lunch plates.
                    </div>
                  </div>
                }
              />
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                color: '#34d399',
                margin: '2px 0',
              }}
            >
              {currency}{monthlyStats.totalSpent.toLocaleString()}
            </div>
            <div style={{ fontSize: '11.5px', color: '#c4b5fd' }}>
              ✨ Saved {currency}{monthlyStats.carriedOverValue.toLocaleString()} in carry-over skips
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            paddingTop: '12px',
            marginTop: '12px',
            borderTop: '1px solid var(--glass-border)',
            fontSize: '12px',
          }}
        >
          {isPlanIncludesBf && (
            <div style={{ color: 'var(--text-secondary)' }}>
              🍳 Breakfasts: <strong style={{ color: '#fbbf24' }}>{monthlyStats.breakfastDelivered}</strong>
            </div>
          )}
          {isPlanIncludesLunch && (
            <div style={{ color: 'var(--text-secondary)' }}>
              🍱 Lunches: <strong style={{ color: '#34d399' }}>{monthlyStats.lunchDelivered}</strong>
            </div>
          )}
          <div style={{ color: 'var(--text-secondary)' }}>
            🏖️ Cook Off: <strong style={{ color: '#f87171' }}>{monthlyStats.cookOffDays} days</strong>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            📝 Logged Days: <strong style={{ color: '#60a5fa' }}>{monthlyStats.loggedDaysCount}</strong>
          </div>
        </div>
      </div>

      {/* 4. BANK STATEMENT & PDF TO WHATSAPP EXTRACT (HERO CARD) */}
      <div
        className="ios-card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
          border: '1.5px solid rgba(16, 185, 129, 0.45)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Bank Statement PDF to WhatsApp
                </h3>
                <InfoPopover
                  title="Official Bank Statement PDF"
                  color="#34d399"
                  content="Generates an official bank-statement look-alike PDF showing each day's served dishes, billing debits, and carry-over savings ready to send to your cook on WhatsApp or download."
                />
              </div>
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                {monthlyStats.monthLabel} · Itemized Daily Food Ledger
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            PDF Extract
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
          <button
            type="button"
            onClick={handleOpenExtractModal}
            className="ios-btn ios-btn-whatsapp"
            style={{ fontSize: '13px', padding: '11px 12px', gap: '8px' }}
          >
            <Share2 size={16} />
            <span>Send PDF to Cook</span>
          </button>

          <button
            type="button"
            onClick={handleOpenExtractModal}
            className="ios-btn ios-btn-secondary"
            style={{ fontSize: '13px', padding: '11px 12px', gap: '8px' }}
          >
            <FileSpreadsheet size={16} color="#34d399" />
            <span>Extract &amp; Ledger</span>
          </button>
        </div>
      </div>

      {/* 4B. MONTHLY WHATSAPP STATEMENT TEXT FOR SELECTED MONTH */}
      <div className="ios-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#25D366" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {monthlyStats.monthLabel.split(' ')[0]} WhatsApp Text Preview
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            To {config.catererName || 'Cook'}
          </span>
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
            maxHeight: '130px',
            overflowY: 'auto',
            marginBottom: '14px',
            userSelect: 'text',
          }}
        >
          {monthlySummaryText}
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
            <span>Send Text</span>
          </button>
        </div>
      </div>

      {/* 5. MONTHLY ACTIVITY LOGS (FILTERED TO SELECTED MONTH) */}
      <div className="ios-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <Calendar size={16} color="var(--text-muted)" />
              <span>
                Activity Logs · {monthlyStats.monthLabel} ({monthDates.length})
              </span>
            </h3>
            <InfoPopover
              title="Daily Activity Logs"
              color="#94a3b8"
              content="Tap any date row in this list to expand full dish names, notes, and individual portion rates, or to edit past meal details."
            />
          </div>
        </div>

        {monthDates.length === 0 ? (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '28px 16px',
            }}
          >
            <CalendarDays
              size={26}
              color="var(--text-muted)"
              style={{ margin: '0 auto 8px auto', opacity: 0.4 }}
            />
            <div>No meal activity recorded for {monthlyStats.monthLabel}.</div>
            {Boolean(activePackage && activePackage.status === 'active') ? (
              <div style={{ fontSize: '11px', marginTop: '4px', color: '#a78bfa' }}>
                Use the "Edit Past History" section above to log meals for any day in this month.
              </div>
            ) : (
              <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                Subscribe to a meal plan to start tracking meals and carry-overs.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monthDates.map((dateStr) => {
              const rec = records[dateStr];
              const isExpanded = expandedDate === dateStr;

              const bStat = rec.breakfast?.status || 'none';
              const lStat = rec.lunch?.status || 'none';
              const bPersons = rec.breakfast?.persons || 1;
              const lPersons = rec.lunch?.persons || 1;

              const shouldShowRowBf = bStat !== 'none' && (isPlanIncludesBf || bStat === 'extra');
              const shouldShowRowLunch = lStat !== 'none' && (isPlanIncludesLunch || lStat === 'extra');

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
                    background: isExpanded
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.025)',
                    border: isExpanded
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid var(--glass-border)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
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
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                        {formattedRowDate}
                      </span>
                      {rec.isCookOff && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#f87171',
                            background: 'rgba(239, 68, 68, 0.15)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          🏖️ Cook Off
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Compact Breakfast Badge */}
                      {shouldShowRowBf && (
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '10px',
                            fontWeight: 600,
                            background:
                              bStat === 'delivered'
                                ? 'rgba(251, 191, 36, 0.18)'
                                : bStat === 'skipped'
                                ? 'var(--accent-carryover-subtle)'
                                : 'rgba(255,255,255,0.05)',
                            color:
                              bStat === 'delivered'
                                ? '#fbbf24'
                                : bStat === 'skipped'
                                ? '#c4b5fd'
                                : 'var(--text-muted)',
                          }}
                        >
                          🍳 {bStat === 'delivered' ? `${bPersons}p` : bStat === 'skipped' ? 'Skip' : bStat}
                        </span>
                      )}

                      {/* Compact Lunch Badge */}
                      {shouldShowRowLunch && (
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '10px',
                            fontWeight: 600,
                            background:
                              lStat === 'delivered'
                                ? 'rgba(16, 185, 129, 0.18)'
                                : lStat === 'skipped'
                                ? 'var(--accent-carryover-subtle)'
                                : 'rgba(255,255,255,0.05)',
                            color:
                              lStat === 'delivered'
                                ? '#34d399'
                                : lStat === 'skipped'
                                ? '#c4b5fd'
                                : 'var(--text-muted)',
                          }}
                        >
                          🍱 {lStat === 'delivered' ? `${lPersons}p` : lStat === 'skipped' ? 'Skip' : lStat}
                        </span>
                      )}

                      {isExpanded ? (
                        <ChevronUp size={14} color="var(--text-muted)" />
                      ) : (
                        <ChevronDown size={14} color="var(--text-muted)" />
                      )}
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
                        fontSize: '11.5px',
                      }}
                    >
                      {/* Breakfast Detail */}
                      {shouldShowRowBf && (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: '#fbbf24',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Coffee size={12} /> Breakfast: {bStat.toUpperCase()}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {bPersons} Person(s) · {currency}
                              {rec.breakfast?.rate || config.defaultBreakfastRate}/p
                            </span>
                          </div>
                          <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                            🍲 <strong>Dish / Sent:</strong>{' '}
                            {rec.breakfast?.menuItem || (
                              <span style={{ color: 'var(--text-muted)' }}>No dish noted</span>
                            )}
                          </div>
                          {rec.breakfast?.autoDelivered && (
                            <div style={{ marginTop: '3px', color: '#60a5fa', fontSize: '10.5px' }}>
                              ⚡ Auto-marked delivered after 11:00 AM IST cutoff
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lunch Detail */}
                      {shouldShowRowLunch && (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: '#34d399',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Utensils size={12} /> Lunch: {lStat.toUpperCase()}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {lPersons} Person(s) · {currency}
                              {rec.lunch?.rate || config.defaultLunchRate}/p
                            </span>
                          </div>
                          <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                            🍲 <strong>Dish / Sent:</strong>{' '}
                            {rec.lunch?.menuItem || (
                              <span style={{ color: 'var(--text-muted)' }}>No dish noted</span>
                            )}
                          </div>
                          {rec.lunch?.autoDelivered && (
                            <div style={{ marginTop: '3px', color: '#60a5fa', fontSize: '10.5px' }}>
                              ⚡ Auto-marked delivered after 3:00 PM IST cutoff
                            </div>
                          )}
                        </div>
                      )}

                      {!shouldShowRowBf && !shouldShowRowLunch && (
                        <div style={{ color: rec.isCookOff ? '#f87171' : 'var(--text-muted)', fontSize: '11px', padding: '2px 0' }}>
                          {rec.isCookOff ? '🏖️ Cook Off Day (Meals carried over)' : 'No meals recorded for this plan.'}
                        </div>
                      )}

                      {/* Day Note & Edit Action */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '2px',
                        }}
                      >
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                          {rec.notes ? `Note: ${rec.notes}` : ''}
                        </div>
                        {onOpenDayDetails && (
                          <button
                            type="button"
                            onClick={() => onOpenDayDetails(dateStr)}
                            className="ios-btn ios-btn-secondary"
                            style={{
                              padding: '5px 12px',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
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
      {/* STATEMENT EXPORT MODAL */}
      <StatementExportModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        records={records}
        activePackage={activePackage}
        config={config}
        initialMonthKey={selectedMonthKey}
      />
    </div>
  );
};
