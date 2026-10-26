import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CarryOverStats, RateConfig, PackagePlan, DayRecord } from '../../types';
import {
  generateMonthlyWhatsAppSummary,
  calculateMonthlyStats,
  getLast6Months,
  getIstNow,
  addDays,
  getEffectiveMealRates,
  calculateCarryOver,
} from '../../services/carryOverEngine';
import {
  generateBankStatementData,
  generateFullBankStatementText,
} from '../../services/statementPdfGenerator';
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
  X,
  Layers,
} from 'lucide-react';
import { StatementExportModal } from './StatementExportModal';
import { InfoPopover } from '../common/InfoPopover';

interface ExpenseBreakdownProps {
  stats: CarryOverStats;
  config: RateConfig;
  activePackage: PackagePlan | null;
  packages?: PackagePlan[];
  records: Record<string, DayRecord>;
  onOpenDayDetails?: (dateStr: string) => void;
  onOpenStatementModal?: (monthKey?: string, range?: { startDate: string; endDate: string; label?: string }) => void;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({
  stats,
  config,
  activePackage,
  packages,
  records,
  onOpenDayDetails,
  onOpenStatementModal,
}) => {
  const currency = config.currency || '₹';
  const { dateStr: todayStr } = getIstNow();
  const currentMonthKey = todayStr.slice(0, 7);
  const oneMonthAgoStr = addDays(todayStr, -30);

  const effectiveRates = getEffectiveMealRates(packages, activePackage, config);

  // Check meal types included in active package or across plans
  const isPlanIncludesBf = effectiveRates.incBreakfast;
  const isPlanIncludesLunch = effectiveRates.incLunch;

  const [copied, setCopied] = useState(false);
  const [copiedBankStatement, setCopiedBankStatement] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Quick view preset: '15d' | '1m' | '2m' | 'custom'
  // DEFAULT SELECTION IS ALWAYS CURRENT MONTH ('1m')!
  const [quickPreset, setQuickPreset] = useState<'15d' | '1m' | '2m' | 'custom'>('1m');

  // 6 Months History Selector for From / To dropdowns (counts back up to 6 months from current month)
  const monthOptions = getLast6Months(6);

  // From-Month to To-Month selectors (defaults strictly to current month!)
  const [fromMonth, setFromMonth] = useState<string>(currentMonthKey);
  const [toMonth, setToMonth] = useState<string>(currentMonthKey);

  // Edit Past History state: strictly limited to within 1 month (30 days ago to today)
  const defaultPastDate = addDays(todayStr, -1);
  const [pastEditDate, setPastEditDate] = useState<string>(defaultPastDate);

  // Compute exact startDate, endDate, and rangeLabel based on quickPreset and from/to month
  const { startDate, endDate, rangeLabel } = React.useMemo(() => {
    if (quickPreset === '15d') {
      const start = addDays(todayStr, -14);
      const end = todayStr;
      return {
        startDate: start,
        endDate: end,
        rangeLabel: `Last 15 Days (${start} to ${end})`,
      };
    }
    if (quickPreset === '1m') {
      const start = `${currentMonthKey}-01`;
      const end = todayStr;
      const dateObj = new Date(currentMonthKey + '-01T00:00:00');
      const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return {
        startDate: start,
        endDate: end,
        rangeLabel: `${monthName} (${start} to ${end})`,
      };
    }
    if (quickPreset === '2m') {
      const [y, m] = currentMonthKey.split('-').map(Number);
      const prevDateObj = new Date(y, m - 2, 1);
      const prevY = prevDateObj.getFullYear();
      const prevM = String(prevDateObj.getMonth() + 1).padStart(2, '0');
      const start = `${prevY}-${prevM}-01`;
      const end = todayStr;
      return {
        startDate: start,
        endDate: end,
        rangeLabel: `Last 2 Months (${start} to ${end})`,
      };
    }

    // Custom fromMonth to toMonth
    const actualFrom = fromMonth <= toMonth ? fromMonth : toMonth;
    const actualTo = fromMonth <= toMonth ? toMonth : fromMonth;
    const start = `${actualFrom}-01`;
    const [toY, toM] = actualTo.split('-').map(Number);
    const daysInToMonth = new Date(toY, toM, 0).getDate();
    const isCurrentToMonth = actualTo === currentMonthKey;
    const end = isCurrentToMonth ? todayStr : `${actualTo}-${String(daysInToMonth).padStart(2, '0')}`;

    const fromLabel = new Date(actualFrom + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const toLabel = new Date(actualTo + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const label = actualFrom === actualTo ? `${fromLabel} (${start} to ${end})` : `${fromLabel} to ${toLabel} (${start} to ${end})`;

    return {
      startDate: start,
      endDate: end,
      rangeLabel: label,
    };
  }, [quickPreset, fromMonth, toMonth, todayStr, currentMonthKey]);

  // Collated Bank Statement data model for the exact selected period
  const statementData = generateBankStatementData(
    'custom',
    currentMonthKey,
    records,
    activePackage,
    config,
    'Household Account',
    packages,
    { startDate, endDate, label: rangeLabel }
  );

  const fullBankStatementText = generateFullBankStatementText(statementData);

  const companionMessageText = `🍽️ *Tiffin Statement - ${rangeLabel}*
📅 *Period:* ${startDate} to ${endDate}
Hi ${config.catererName || 'Cook'},
• Meals Served: ${statementData.breakfastDelivered + statementData.lunchDelivered} (${currency}${statementData.totalSpent.toLocaleString()})
• Skips / Saved: ${statementData.carryOverDaysSaved}d (${currency}${statementData.totalCarriedOverValue.toLocaleString()})
• Net Balance Remaining: ${currency}${statementData.netRemainingBalance.toLocaleString()} (${statementData.remainingDays} days left)

Attached is the official Food Statement PDF with itemized daily logs.`;

  // Filter dates strictly for the selected period, sorted newest first
  const periodDates = Object.keys(records)
    .filter((d) => d >= startDate && d <= endDate)
    .sort()
    .reverse();

  // Smart scaling: display recent 7 logs unless user expands
  const displayedDates = showAllLogs || periodDates.length <= 7 ? periodDates : periodDates.slice(0, 7);

  const handleOpenExtractModal = () => {
    if (onOpenStatementModal) {
      onOpenStatementModal(currentMonthKey, { startDate, endDate, label: rangeLabel });
    } else {
      setIsStatementModalOpen(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(companionMessageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyFullBankStatement = () => {
    navigator.clipboard.writeText(fullBankStatementText);
    setCopiedBankStatement(true);
    setTimeout(() => setCopiedBankStatement(false), 2500);
  };

  const handleWhatsAppShare = () => {
    let phone = config.catererPhone ? config.catererPhone.replace(/[^0-9]/g, '') : '';
    if (phone && phone.length === 10) {
      phone = `91${phone}`;
    }
    const encoded = encodeURIComponent(companionMessageText);
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
        <div className="ios-card edit-history-card">
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
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              <History size={16} className="edit-history-title-icon" />
              <span>Edit Past History</span>
            </h3>
            <InfoPopover
              title="Edit Past History"
              color="var(--accent-carryover)"
              content={
                <div>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Select any date within the past 30 days to update delivered meals, portions, custom dish names, or skips so they reflect accurately in your billing logs.
                  </p>
                  <div
                    style={{
                      padding: '8px 10px',
                      background: 'var(--subtle-card-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.4',
                    }}
                  >
                    <strong>30-Day Window:</strong> Allowed dates are strictly between <strong>{oneMonthAgoStr}</strong> (30 days ago) and <strong>{todayStr}</strong> (today). Future dates and dates older than 30 days are locked.
                  </div>
                </div>
              }
            />
          </div>
          <span className="edit-history-badge">
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
                className={`edit-history-preset-btn ${isPresetActive ? 'active' : 'inactive'}`}
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
        <div className="edit-history-preview">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
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
                  color: 'var(--funds-text-primary)',
                  background: 'var(--funds-badge-bg)',
                  border: '1px solid var(--funds-badge-border)',
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
                  color: 'var(--accent-breakfast)',
                  background: 'var(--accent-breakfast-subtle)',
                  border: '1px solid var(--accent-breakfast-subtle)',
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
                <span style={{ color: 'var(--accent-skip)', fontWeight: 600 }}>🏖️ Cook Off Day</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {pastBStat !== 'none' && (isPlanIncludesBf || pastBStat === 'extra') && (
                    <div>
                      🍳 Breakfast:{' '}
                      <strong style={{ color: pastBStat === 'delivered' ? 'var(--accent-breakfast)' : 'var(--accent-carryover)' }}>
                        {pastBStat}
                      </strong>
                      {pastRec?.breakfast?.menuItem && (
                        <span style={{ color: 'var(--text-muted)' }}> — {pastRec.breakfast.menuItem}</span>
                      )}
                    </div>
                  )}
                  {pastLStat !== 'none' && (isPlanIncludesLunch || pastLStat === 'extra') && (
                    <div>
                      🍱 Lunch:{' '}
                      <strong style={{ color: pastLStat === 'delivered' ? 'var(--accent-lunch)' : 'var(--accent-carryover)' }}>
                        {pastLStat}
                      </strong>
                      {pastRec?.lunch?.menuItem && (
                        <span style={{ color: 'var(--text-muted)' }}> — {pastRec.lunch.menuItem}</span>
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

      {/* 2. REPORT PERIOD & QUICK VIEW SELECTOR */}
      <div className="ios-card" style={{ padding: '14px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              fontSize: '13.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
            }}
          >
            <Calendar size={16} color="var(--accent-lunch)" />
            <span>Report Period &amp; Quick Views</span>
          </div>
          <span
            style={{
              fontSize: '10.5px',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
            }}
          >
            {quickPreset === '15d'
              ? 'Last 15 Days'
              : quickPreset === '1m'
              ? 'Current Month'
              : quickPreset === '2m'
              ? 'Last 2 Months'
              : 'Custom Month Range'}
          </span>
        </div>

        {/* 3 Quick View Preset Buttons (Last 15 days, 1 month, 2 months) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setQuickPreset('15d')}
            className={`edit-history-preset-btn ${quickPreset === '15d' ? 'active' : 'inactive'}`}
            style={{ padding: '9px 4px', fontSize: '11.5px', fontWeight: 600 }}
          >
            ⚡ Last 15 Days
          </button>
          <button
            type="button"
            onClick={() => {
              setQuickPreset('1m');
              setFromMonth(currentMonthKey);
              setToMonth(currentMonthKey);
            }}
            className={`edit-history-preset-btn ${quickPreset === '1m' ? 'active' : 'inactive'}`}
            style={{ padding: '9px 4px', fontSize: '11.5px', fontWeight: 600 }}
          >
            📅 1 Month (Current)
          </button>
          <button
            type="button"
            onClick={() => setQuickPreset('2m')}
            className={`edit-history-preset-btn ${quickPreset === '2m' ? 'active' : 'inactive'}`}
            style={{ padding: '9px 4px', fontSize: '11.5px', fontWeight: 600 }}
          >
            🗓️ Last 2 Months
          </button>
        </div>

        {/* From Month to To Month Selectors */}
        <div
          style={{
            background: 'var(--subtle-card-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Choose Custom Month Range:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                From Month:
              </label>
              <select
                className="ios-input"
                value={fromMonth}
                onChange={(e) => {
                  setFromMonth(e.target.value);
                  setQuickPreset('custom');
                }}
                style={{ padding: '8px 10px', fontSize: '12.5px', width: '100%' }}
              >
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.fullLabel || m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                To Month:
              </label>
              <select
                className="ios-input"
                value={toMonth}
                onChange={(e) => {
                  setToMonth(e.target.value);
                  setQuickPreset('custom');
                }}
                style={{ padding: '8px 10px', fontSize: '12.5px', width: '100%' }}
              >
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.fullLabel || m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Range Confirmation Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              paddingTop: '6px',
              borderTop: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>📅 <strong>Range:</strong> {startDate} to {endDate}</span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>{periodDates.length} Days Recorded</span>
          </div>
        </div>
      </div>

      {/* 3. COLLATED FOOD STATEMENT & WHATSAPP SUMMARY */}
      <div
        className="ios-card statement-card"
        style={{ padding: '16px' }}
      >
        {/* Header Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Food Statement &amp; WhatsApp Summary
                </h3>
                <InfoPopover
                  title="Collated Food Statement"
                  color="#34d399"
                  content="This statement dynamically collates your active Breakfast and Lunch plans for the selected date range. You can send the official PDF to your cook or copy the formatted text."
                />
              </div>
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                📅 {startDate} to {endDate} ({rangeLabel})
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
              flexShrink: 0,
            }}
          >
            Collated
          </span>
        </div>

        {/* 4 Clean Metric Cards for the Selected Period */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          {/* Card 1: Debited in period */}
          <div style={{ background: 'var(--subtle-card-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Debited</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-lunch)', margin: '2px 0 1px' }}>
              {currency}{statementData.totalSpent.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {statementData.effectiveDaysConsumed} days used in period
            </div>
          </div>

          {/* Card 2: Meals Served */}
          <div style={{ background: 'var(--subtle-card-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '9.5px', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Meals Served</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399', margin: '2px 0 1px' }}>
              {statementData.breakfastDelivered + statementData.lunchDelivered}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              🍳 {statementData.breakfastDelivered} Breakfast · 🍱 {statementData.lunchDelivered} Lunch
            </div>
          </div>

          {/* Card 3: Carry-over credit */}
          <div style={{ background: 'var(--subtle-card-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '9.5px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Carry-Over Credit</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24', margin: '2px 0 1px' }}>
              +{statementData.carryOverDaysSaved}d
            </div>
            <div style={{ fontSize: '10px', color: '#fbbf24' }}>
              {currency}{statementData.totalCarriedOverValue.toLocaleString()} saved
            </div>
          </div>

          {/* Card 4: Net Balance */}
          <div style={{ background: 'var(--subtle-card-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ fontSize: '9.5px', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Net Plan Balance</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8', margin: '2px 0 1px' }}>
              {currency}{statementData.netRemainingBalance.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: '#38bdf8' }}>
              {statementData.remainingDays} days remaining
            </div>
          </div>
        </div>

        {/* Collated Active Subscriptions Pill Strip */}
        {Boolean(statementData.collatedPlans && statementData.collatedPlans.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: statementData.collatedPlans.length > 1 ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr', gap: '6px', marginBottom: '12px' }}>
            {statementData.collatedPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {plan.mealType === 'Breakfast' ? '🍳' : '🍱'} {plan.title}
                  </span>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                    Rate: {currency}{plan.rate}/plate ({plan.persons}p) · {plan.daysDelivered}d used
                  </div>
                </div>
                <strong style={{ color: '#34d399', fontSize: '11.5px' }}>
                  {currency}{plan.remainingBalance.toLocaleString()} left
                </strong>
              </div>
            ))}
          </div>
        )}

        {/* WhatsApp Companion Text Preview */}
        <div className="code-preview-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💬 WhatsApp Companion Message (for {startDate} to {endDate})
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--accent-lunch)', fontWeight: 600 }}>
              To {config.catererName || 'Cook'}
            </span>
          </div>
          <div className="code-text" style={{ whiteSpace: 'pre-line', fontFamily: 'monospace', fontSize: '11.5px' }}>
            {companionMessageText}
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '8px' }}>
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
            <span>View &amp; Ledger</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={handleCopy}
            className="ios-btn ios-btn-secondary"
            style={{ fontSize: '12px', padding: '8px 10px', gap: '6px' }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Copied Quick Text!' : 'Copy Quick Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="ios-btn"
            style={{
              fontSize: '12px',
              padding: '8px 10px',
              gap: '6px',
              background: 'rgba(37, 211, 102, 0.12)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              color: '#4ade80',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <MessageSquare size={14} />
            <span>Send Text Only</span>
          </button>
        </div>

        {/* Copy Full Bank Statement Text (Collated Plans + Daily Comments) */}
        <button
          type="button"
          onClick={handleCopyFullBankStatement}
          className="ios-btn ios-btn-secondary"
          style={{
            width: '100%',
            padding: '9px 12px',
            fontSize: '12px',
            fontWeight: 600,
            gap: '6px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.08)',
          }}
        >
          {copiedBankStatement ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          <span>{copiedBankStatement ? 'Full Bank Statement Copied!' : '📋 Copy Full Bank Statement (Collated Plans + Comments)'}</span>
        </button>
      </div>

      {/* 4. ACTIVITY LOGS (FILTERED TO SELECTED PERIOD) */}
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
                Activity Logs · {rangeLabel}
              </span>
            </h3>
            <InfoPopover
              title="Daily Activity Logs"
              color="#94a3b8"
              content="Tap any date row in this list to expand full dish names, notes, and individual portion rates, or to edit past meal details."
            />
          </div>
        </div>

        {periodDates.length === 0 ? (
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
            <div>No meal activity recorded for {rangeLabel}.</div>
            {Boolean(activePackage && activePackage.status === 'active') ? (
              <div style={{ fontSize: '11px', marginTop: '4px', color: '#a78bfa' }}>
                Use the "Edit Past History" section above to log meals for any day in this period.
              </div>
            ) : (
              <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                Subscribe to a meal plan to start tracking meals and carry-overs.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayedDates.map((dateStr) => {
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
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
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
                                ? 'var(--accent-breakfast)'
                                : bStat === 'skipped'
                                ? 'var(--accent-carryover)'
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
                                ? 'var(--accent-lunch)'
                                : lStat === 'skipped'
                                ? 'var(--accent-carryover)'
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
                    <div className="history-row-expanded">
                      {/* Breakfast Detail */}
                      {shouldShowRowBf && (
                        <div
                          style={{
                            background: 'var(--subtle-card-bg)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--accent-breakfast-subtle)',
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
                                color: 'var(--accent-breakfast)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Coffee size={12} /> Breakfast: {bStat.toUpperCase()}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {bPersons} Person(s) · {currency}
                              {rec.breakfast?.rate || effectiveRates.breakfastRate}/p
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
                            background: 'var(--subtle-card-bg)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--accent-lunch-subtle)',
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
                                color: 'var(--accent-lunch)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Utensils size={12} /> Lunch: {lStat.toUpperCase()}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {lPersons} Person(s) · {currency}
                              {((rec.lunch?.rate && rec.lunch.rate !== 90) || effectiveRates.lunchRate === 90)
                                ? (rec.lunch?.rate || effectiveRates.lunchRate)
                                : effectiveRates.lunchRate}/p
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

            {periodDates.length > 7 && (
              <button
                type="button"
                onClick={() => setShowAllLogs(!showAllLogs)}
                className="ios-btn ios-btn-secondary"
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {showAllLogs ? (
                  <>
                    <ChevronUp size={14} />
                    <span>Show Recent Only</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    <span>View All Activity ({periodDates.length} Days)</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {/* STATEMENT EXPORT MODAL */}
      <StatementExportModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        records={records}
        activePackage={activePackage}
        packages={packages}
        config={config}
        initialMonthKey={currentMonthKey}
        initialRange={{ startDate, endDate, label: rangeLabel }}
      />
    </div>
  );
};
