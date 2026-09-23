import React, { useState } from 'react';
import { DayRecord, RateConfig, PackagePlan } from '../../types';
import { formatDate, getIstNow, calculateCarryOver, isMealActiveOnDate } from '../../services/carryOverEngine';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { DayDetailModal } from './DayDetailModal';
import { TodayActionBar } from './TodayActionBar';
import { InfoPopover } from '../common/InfoPopover';

interface MealCalendarProps {
  records: Record<string, DayRecord>;
  config: RateConfig;
  activePackage: PackagePlan | null;
  isEditMode?: boolean;
  onSaveRecord: (record: DayRecord) => void;
  onClearRecord?: (dateStr: string) => void;
  onClearMonth?: (year: number, month: number) => void;
  onClearAutoMarked?: () => void;
}

export const MealCalendar: React.FC<MealCalendarProps> = ({
  records,
  config,
  activePackage,
  isEditMode = false,
  onSaveRecord,
  onClearRecord,
  onClearMonth,
  onClearAutoMarked,
}) => {
  const todayStr = getIstNow().dateStr;
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Compute active plan dates and dynamic end date for the 4-state calendar view
  const stats = calculateCarryOver(activePackage, records, config);
  const planStart = activePackage ? activePackage.startDate : null;
  const planEnd = activePackage ? stats.extendedEndDate : null;

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  const monthName = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleQuickConfirmToday = (
    status: 'delivered' | 'skipped',
    meal?: 'both' | 'breakfast' | 'lunch'
  ) => {
    const incBreakfast = activePackage ? activePackage.includesBreakfast !== false : true;
    const incLunch = activePackage ? activePackage.includesLunch !== false : true;

    // Current or fallback meal entries
    const existing = records[todayStr];

    let bStatus: 'delivered' | 'skipped' | 'extra' | 'none' = 'none';
    if (meal === 'breakfast') {
      bStatus = status;
    } else if (meal === 'lunch') {
      bStatus = existing?.breakfast?.status || 'none';
    } else {
      bStatus = incBreakfast ? status : 'none';
    }

    let lStatus: 'delivered' | 'skipped' | 'extra' | 'none' = 'none';
    if (meal === 'lunch') {
      lStatus = status;
    } else if (meal === 'breakfast') {
      lStatus = existing?.lunch?.status || 'none';
    } else {
      lStatus = incLunch ? status : 'none';
    }

    const planPersons = activePackage?.defaultPersons || config.defaultPersons || 1;

    const updated: DayRecord = {
      date: todayStr,
      breakfast: {
        status: bStatus,
        persons: existing?.breakfast?.persons || planPersons,
        rate: existing?.breakfast?.rate || activePackage?.breakfastRate || config.defaultBreakfastRate,
        notes: bStatus === 'skipped' ? 'Carried over' : existing?.breakfast?.notes,
        menuItem: existing?.breakfast?.menuItem,
        autoDelivered: existing?.breakfast?.autoDelivered,
      },
      lunch: {
        status: lStatus,
        persons: existing?.lunch?.persons || planPersons,
        rate: existing?.lunch?.rate || activePackage?.lunchRate || config.defaultLunchRate,
        notes: lStatus === 'skipped' ? 'Carried over' : existing?.lunch?.notes,
        menuItem: existing?.lunch?.menuItem,
        autoDelivered: existing?.lunch?.autoDelivered,
      },
      isCookOff: existing?.isCookOff || false,
      notes: existing?.notes,
      updatedAt: new Date().toISOString(),
    };
    onSaveRecord(updated);
  };

  // Calendar Grid Calculation
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1-Tap Today Confirmation Bar */}
      <TodayActionBar
        todayRecord={records[todayStr]}
        activePackage={activePackage}
        config={config}
        isEditMode={isEditMode}
        onConfirmToday={handleQuickConfirmToday}
        onOpenDayDetails={(dateStr) => setSelectedDate(dateStr)}
        onClearToday={onClearRecord}
      />

      {/* Edit Mode Notice Banner */}
      {isEditMode && (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, var(--bg-card) 100%)', 
            border: '1px solid rgba(139, 92, 246, 0.35)', 
            padding: '10px 14px', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '12px', 
            color: 'var(--text-primary)' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>✏️ <strong>Calendar Edit Mode Active</strong></span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {onClearAutoMarked && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Clear all auto-selected deliveries across the calendar?')) {
                      onClearAutoMarked();
                    }
                  }}
                  className="ios-btn ios-btn-secondary"
                  style={{ padding: '4px 9px', fontSize: '11px', color: 'var(--accent-breakfast)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  title="Remove auto-marked entries"
                >
                  🧹 Clear Auto-Selected
                </button>
              )}
              {onClearMonth && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Clear all meal records for ${monthName}?`)) {
                      onClearMonth(year, month);
                    }
                  }}
                  className="ios-btn ios-btn-secondary"
                  style={{ padding: '4px 9px', fontSize: '11px', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  title="Clear all records in this month"
                >
                  🗑️ Clear {monthName.split(' ')[0]}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Month Navigation Card */}
      <div className="ios-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <button 
            onClick={handlePrevMonth}
            style={{ 
              background: 'var(--btn-secondary-bg)', 
              border: '1px solid var(--glass-border)', 
              color: 'var(--text-primary)', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)', margin: 0, color: 'var(--text-primary)' }}>
              {monthName}
            </h3>
            <InfoPopover
              title="Calendar 4-State Visual Guide"
              color="var(--accent-primary)"
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="legend-pip" style={{ background: 'var(--cal-delivered-border)' }} />
                      <span><strong>Delivered (Green):</strong> Meals served &amp; confirmed for the day.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="legend-pip" style={{ background: 'var(--cal-skipped-border)' }} />
                      <span><strong>Skipped / Off (Red):</strong> Meal skipped or cook took leave (carried over).</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="legend-pip" style={{ background: 'var(--cal-planned-border)' }} />
                      <span><strong>In Plan (Blue):</strong> Active subscription day awaiting delivery.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="legend-pip" style={{ background: 'var(--cal-nodeliv-border)' }} />
                      <span><strong>No Delivery (Neutral):</strong> Non-delivery day (e.g. Sunday or outside plan).</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                    💡 Tap any date on the calendar to log, skip, or edit breakfast &amp; lunch for that day.
                  </div>
                </div>
              }
            />
          </div>

          <button 
            onClick={handleNextMonth}
            style={{ 
              background: 'var(--btn-secondary-bg)', 
              border: '1px solid var(--glass-border)', 
              color: 'var(--text-primary)', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* 4-State Visual Legend Bar */}
        <div className="calendar-legend-bar">
          <div className="legend-item" style={{ color: 'var(--cal-delivered-text)' }}>
            <span className="legend-pip" style={{ background: 'var(--cal-delivered-border)' }} />
            <span>Delivered</span>
          </div>
          <div className="legend-item" style={{ color: 'var(--cal-skipped-text)' }}>
            <span className="legend-pip" style={{ background: 'var(--cal-skipped-border)' }} />
            <span>Skipped</span>
          </div>
          <div className="legend-item" style={{ color: 'var(--cal-planned-text)' }}>
            <span className="legend-pip" style={{ background: 'var(--cal-planned-border)' }} />
            <span>In Plan</span>
          </div>
          <div className="legend-item" style={{ color: 'var(--cal-nodeliv-text)' }}>
            <span className="legend-pip" style={{ background: 'var(--cal-nodeliv-border)' }} />
            <span>No Delivery</span>
          </div>
        </div>

        {/* Days of week header */}
        <div className="calendar-grid" style={{ marginBottom: '8px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="calendar-header-day">{day}</div>
          ))}
        </div>

        {/* Calendar Cells with 4-State Indicators */}
        <div className="calendar-grid">
          {daysArray.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty-${idx}`} style={{ aspectRatio: 1 }} />;
            }

            const curDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const record = records[curDateStr];
            const isToday = curDateStr === todayStr;

            const bStatus = record?.breakfast?.status;
            const lStatus = record?.lunch?.status;
            const isCookOff = record?.isCookOff;
            const dayOfWeek = new Date(year, month, dayNum).getDay();

            // 1. Is this day within active subscription date range?
            const isInPlanWindow = Boolean(planStart && planEnd && curDateStr >= planStart && curDateStr <= planEnd);

            // 2. Is delivery scheduled on this day of week?
            const isDeliveryScheduled = activePackage
              ? (isMealActiveOnDate(curDateStr, activePackage, 'breakfast') || isMealActiveOnDate(curDateStr, activePackage, 'lunch'))
              : (dayOfWeek !== 0);

            // 3. Status checks
            const hasDelivered = (!isCookOff) && (
              (bStatus === 'delivered' || bStatus === 'extra') ||
              (lStatus === 'delivered' || lStatus === 'extra')
            );
            const hasSkipped = Boolean(isCookOff || bStatus === 'skipped' || lStatus === 'skipped');

            // 4. Resolve exact State among 4 possibilities:
            // State 3: Red if any skipped or cook off
            // State 2: Green if delivered and no skips
            // State 4: Blue/Planned if within active plan & scheduled & awaiting delivery
            // State 1: Neutral / No Delivery if off day or outside plan
            let dayState: 'delivered' | 'skipped' | 'planned' | 'nodeliv';

            if (hasSkipped) {
              dayState = 'skipped';
            } else if (hasDelivered) {
              dayState = 'delivered';
            } else if (isInPlanWindow && isDeliveryScheduled) {
              dayState = 'planned';
            } else {
              dayState = 'nodeliv';
            }

            return (
              <div
                key={curDateStr}
                onClick={() => setSelectedDate(curDateStr)}
                className={`calendar-day-cell cal-state-${dayState} ${isToday ? 'today' : ''}`}
                title={`${curDateStr}: ${dayState.toUpperCase()}`}
              >
                <span className="calendar-day-number">
                  {dayNum}
                </span>

                <div className="day-badges-row">
                  {/* Badges reflecting the 4 states */}
                  {dayState === 'skipped' && (
                    isCookOff ? (
                      <span style={{ fontSize: '10px' }} title="Cook Off Day">🏖️</span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 800 }} title="Skipped / Carried over">⏭️</span>
                    )
                  )}

                  {dayState === 'delivered' && (
                    <>
                      {bStatus && (bStatus === 'delivered' || bStatus === 'extra') && (
                        <div 
                          className="dot-indicator dot-breakfast"
                          title="Breakfast Delivered"
                        />
                      )}
                      {lStatus && (lStatus === 'delivered' || lStatus === 'extra') && (
                        <div 
                          className="dot-indicator dot-lunch"
                          title="Lunch Delivered"
                        />
                      )}
                    </>
                  )}

                  {dayState === 'planned' && (
                    <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.9 }} title="Scheduled in plan">
                      ⏳
                    </span>
                  )}

                  {dayState === 'nodeliv' && (
                    <span style={{ fontSize: '9px', opacity: 0.4 }} title="No delivery scheduled">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Sheet Modal */}
      {selectedDate && (
        <DayDetailModal
          dateStr={selectedDate}
          record={records[selectedDate]}
          config={config}
          activePackage={activePackage}
          onSave={onSaveRecord}
          onClear={onClearRecord}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
};
