import React, { useState } from 'react';
import { DayRecord, RateConfig, PackagePlan } from '../../types';
import { formatDate, getIstNow } from '../../services/carryOverEngine';
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
              title="Calendar Color Guide"
              color="var(--accent-primary)"
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="dot-indicator dot-breakfast" />
                      <span>🍳 Breakfast</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="dot-indicator dot-lunch" />
                      <span>🍱 Lunch</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="dot-indicator dot-carryover" />
                      <span>⏭️ Skipped (Carry-over)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🏖️ Cook Off</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                    💡 Tap any date on the calendar to mark, skip, or edit portions for that day.
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

        {/* Days of week header */}
        <div className="calendar-grid" style={{ marginBottom: '8px' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="calendar-header-day">{day}</div>
          ))}
        </div>

        {/* Calendar Cells */}
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
            const isScheduledOff = activePackage?.activeDaysOfWeek
              ? !activePackage.activeDaysOfWeek.includes(dayOfWeek)
              : false;

            const hasConfirmedDelivery = (bStatus && bStatus !== 'none') || (lStatus && lStatus !== 'none') || isCookOff;

            return (
              <div
                key={curDateStr}
                onClick={() => setSelectedDate(curDateStr)}
                className={`calendar-day-cell ${isToday ? 'today' : ''}`}
                style={{
                  background: isCookOff 
                    ? 'rgba(239, 68, 68, 0.12)' 
                    : isScheduledOff && !hasConfirmedDelivery
                    ? 'rgba(255, 255, 255, 0.015)'
                    : undefined,
                  borderColor: isCookOff 
                    ? 'rgba(239, 68, 68, 0.3)' 
                    : isToday 
                    ? 'var(--accent-primary)' 
                    : undefined,
                  opacity: isScheduledOff && !hasConfirmedDelivery ? 0.45 : 1
                }}
              >
                <span className="calendar-day-number" style={{ color: isToday ? 'var(--accent-primary)' : 'inherit', fontWeight: isToday ? 800 : 600 }}>
                  {dayNum}
                </span>

                <div className="day-badges-row">
                  {/* Cook Off Badge or Dots */}
                  {isCookOff ? (
                    <span style={{ fontSize: '10px' }}>🏖️</span>
                  ) : (
                    <>
                      {/* Breakfast dot - only shows when confirmed */}
                      {bStatus && bStatus !== 'none' && (
                        <div 
                          className={`dot-indicator ${
                            bStatus === 'delivered' ? 'dot-breakfast' :
                            bStatus === 'skipped' ? 'dot-carryover' : 'dot-indicator'
                          }`}
                          style={{
                            background: bStatus === 'extra' ? '#3b82f6' : undefined,
                          }}
                          title={`Breakfast: ${bStatus}`}
                        />
                      )}

                      {/* Lunch dot - only shows when confirmed */}
                      {lStatus && lStatus !== 'none' && (
                        <div 
                          className={`dot-indicator ${
                            lStatus === 'delivered' ? 'dot-lunch' :
                            lStatus === 'skipped' ? 'dot-carryover' : 'dot-indicator'
                          }`}
                          style={{
                            background: lStatus === 'extra' ? '#3b82f6' : undefined,
                          }}
                          title={`Lunch: ${lStatus}`}
                        />
                      )}
                    </>
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
