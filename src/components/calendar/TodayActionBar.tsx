import React from 'react';
import { DayRecord, PackagePlan, RateConfig } from '../../types';
import { formatDate } from '../../services/carryOverEngine';
import { Check, FastForward, Clock, Edit2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodayActionBarProps {
  todayRecord?: DayRecord;
  activePackage: PackagePlan | null;
  config: RateConfig;
  onConfirmToday: (status: 'delivered' | 'skipped') => void;
  onOpenDayDetails: (dateStr: string) => void;
}

export const TodayActionBar: React.FC<TodayActionBarProps> = ({
  todayRecord,
  activePackage,
  config,
  onConfirmToday,
  onOpenDayDetails,
}) => {
  const todayDate = new Date();
  const todayStr = formatDate(todayDate);
  const formattedToday = todayDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const todayDayOfWeek = todayDate.getDay();
  const isScheduledOff = activePackage?.activeDaysOfWeek
    ? !activePackage.activeDaysOfWeek.includes(todayDayOfWeek)
    : false;

  const bStatus = todayRecord?.breakfast?.status;
  const lStatus = todayRecord?.lunch?.status;
  const isCookOff = todayRecord?.isCookOff;

  // Has the user manually logged today?
  const isLogged = (bStatus && bStatus !== 'none') || (lStatus && lStatus !== 'none') || isCookOff;

  const handleQuickConfirm = (status: 'delivered' | 'skipped') => {
    if (status === 'delivered') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });
    }
    onConfirmToday(status);
  };

  return (
    <div className="ios-card" style={{ padding: '16px 18px', background: isLogged ? 'var(--bg-card)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Today: {formattedToday}</span>
        </div>

        {isScheduledOff && (
          <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            🏖️ Scheduled Off-Day
          </span>
        )}
      </div>

      {isLogged ? (
        // Already confirmed view
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>✅</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Meals Confirmed</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isCookOff ? 'Cook Off (Carried over)' : `🍳 ${bStatus || 'none'} · 🍱 ${lStatus || 'none'}`}
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenDayDetails(todayStr)}
            className="ios-btn ios-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '11px' }}
          >
            <Edit2 size={12} />
            <span>Edit</span>
          </button>
        </div>
      ) : (
        // Pending manual confirmation view
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Did your meals arrive today? Tap below to confirm and track:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr', gap: '8px' }}>
            <button
              onClick={() => handleQuickConfirm('delivered')}
              className="ios-btn ios-btn-primary"
              style={{ padding: '10px 8px', fontSize: '12px' }}
            >
              <Check size={14} />
              <span>Served ✅</span>
            </button>

            <button
              onClick={() => handleQuickConfirm('skipped')}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '10px 8px', fontSize: '12px', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.4)' }}
            >
              <FastForward size={14} />
              <span>Skip (Carry)</span>
            </button>

            <button
              onClick={() => onOpenDayDetails(todayStr)}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '10px 8px', fontSize: '11px' }}
            >
              <span>More...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
