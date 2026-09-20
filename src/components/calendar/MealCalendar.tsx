import React, { useState } from 'react';
import { DayRecord, RateConfig, PackagePlan } from '../../types';
import { formatDate } from '../../services/carryOverEngine';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { DayDetailModal } from './DayDetailModal';

interface MealCalendarProps {
  records: Record<string, DayRecord>;
  config: RateConfig;
  activePackage: PackagePlan | null;
  onSaveRecord: (record: DayRecord) => void;
}

export const MealCalendar: React.FC<MealCalendarProps> = ({
  records,
  config,
  activePackage,
  onSaveRecord,
}) => {
  const todayStr = formatDate(new Date());
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
      {/* Month Navigation Card */}
      <div className="ios-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <button 
            onClick={handlePrevMonth}
            style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={18} />
          </button>

          <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            {monthName}
          </h3>

          <button 
            onClick={handleNextMonth}
            style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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

            return (
              <div
                key={curDateStr}
                onClick={() => setSelectedDate(curDateStr)}
                className={`calendar-day-cell ${isToday ? 'today' : ''}`}
                style={{
                  background: isCookOff 
                    ? 'rgba(239, 68, 68, 0.12)' 
                    : isScheduledOff && !bStatus && !lStatus
                    ? 'rgba(255, 255, 255, 0.015)'
                    : undefined,
                  borderColor: isCookOff 
                    ? 'rgba(239, 68, 68, 0.3)' 
                    : undefined,
                  opacity: isScheduledOff && !bStatus && !lStatus ? 0.45 : 1
                }}
              >
                <span className="calendar-day-number" style={{ color: isToday ? 'var(--accent-primary)' : 'inherit' }}>
                  {dayNum}
                </span>

                <div className="day-badges-row">
                  {/* Cook Off Badge or Dots */}
                  {isCookOff ? (
                    <span style={{ fontSize: '10px' }}>🏖️</span>
                  ) : (
                    <>
                      {/* Breakfast dot */}
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

                      {/* Lunch dot */}
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

      {/* Calendar Color Legend */}
      <div className="ios-card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Calendar Legend:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="dot-indicator dot-breakfast" />
            <span>🍳 Breakfast Served</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="dot-indicator dot-lunch" />
            <span>🍱 Lunch Served</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="dot-indicator dot-carryover" />
            <span>⏭️ Skipped (Carried Over)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🏖️ Cook Holiday</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ opacity: 0.5 }}>📅 Scheduled Off-Day</span>
          </div>
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
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
};
