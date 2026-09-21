import React from 'react';
import { DayRecord, MealStatus, RateConfig, PackagePlan } from '../../types';
import { formatDate } from '../../services/carryOverEngine';
import { Check, X, Users, AlertCircle, Sparkles, Coffee, UtensilsCrossed, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodayQuickLoggerProps {
  todayRecord: DayRecord;
  config: RateConfig;
  activePackage: PackagePlan | null;
  onUpdateRecord: (updated: DayRecord) => void;
  onResetToday?: () => void;
}

export const TodayQuickLogger: React.FC<TodayQuickLoggerProps> = ({
  todayRecord,
  config,
  activePackage,
  onUpdateRecord,
  onResetToday,
}) => {
  const currency = config.currency || '₹';
  const todayDateObj = new Date();
  const formattedTodayDate = todayDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const todayDayOfWeek = todayDateObj.getDay();
  const isScheduledOff = activePackage?.activeDaysOfWeek 
    ? !activePackage.activeDaysOfWeek.includes(todayDayOfWeek)
    : false;

  const incBreakfast = activePackage ? activePackage.includesBreakfast !== false : true;
  const incLunch = activePackage ? activePackage.includesLunch !== false : true;

  const handleMealStatusChange = (type: 'breakfast' | 'lunch', status: MealStatus) => {
    const updated: DayRecord = {
      ...todayRecord,
      [type]: {
        ...todayRecord[type],
        status,
        rate: type === 'breakfast' 
          ? (activePackage?.breakfastRate || config.defaultBreakfastRate)
          : (activePackage?.lunchRate || config.defaultLunchRate),
        persons: todayRecord[type]?.persons || config.defaultPersons || 1,
      },
      updatedAt: new Date().toISOString(),
    };

    // Trigger celebratory confetti on delivery mark
    if (status === 'delivered') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });
    }

    onUpdateRecord(updated);
  };

  const handlePersonsChange = (type: 'breakfast' | 'lunch', delta: number) => {
    const currentPersons = todayRecord[type]?.persons || config.defaultPersons || 1;
    const newPersons = Math.max(1, currentPersons + delta);
    onUpdateRecord({
      ...todayRecord,
      [type]: {
        ...todayRecord[type],
        persons: newPersons,
      },
    });
  };

  const toggleCookOff = () => {
    const isOff = !todayRecord.isCookOff;
    onUpdateRecord({
      ...todayRecord,
      isCookOff: isOff,
      breakfast: {
        ...todayRecord.breakfast,
        status: isOff ? 'skipped' : 'delivered',
        notes: isOff ? 'Cook on Leave (Carried over)' : undefined,
      },
      lunch: {
        ...todayRecord.lunch,
        status: isOff ? 'skipped' : 'delivered',
        notes: isOff ? 'Cook on Leave (Carried over)' : undefined,
      },
      notes: isOff ? 'Cook on Leave' : undefined,
    });
  };

  const breakfastStatus = todayRecord.breakfast?.status || 'none';
  const lunchStatus = todayRecord.lunch?.status || 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Date & Cook Off Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Today's Log
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            {formattedTodayDate}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onResetToday && (breakfastStatus !== 'none' || lunchStatus !== 'none' || todayRecord.isCookOff) && (
            <button
              onClick={onResetToday}
              title="Reset today's logged meals"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={toggleCookOff}
            style={{
              background: todayRecord.isCookOff ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: todayRecord.isCookOff ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--glass-border)',
              color: todayRecord.isCookOff ? '#f87171' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <AlertCircle size={14} />
            <span>{todayRecord.isCookOff ? 'Cook Off (Carried)' : 'Cook Off?'}</span>
          </button>
        </div>
      </div>

      {/* Scheduled Off Day Notice */}
      {isScheduledOff && (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px dashed var(--glass-border)', padding: '12px 14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🏖️</span>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong>Scheduled Off-Day:</strong> Today is an off-day in your plan schedule. Meals will not be deducted from your package unless marked as served.
          </div>
        </div>
      )}

      {/* Breakfast Card */}
      {incBreakfast && (
        <div className="ios-card" style={{ borderColor: breakfastStatus === 'delivered' ? 'rgba(245, 158, 11, 0.4)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{ 
                  background: 'var(--accent-breakfast-subtle)', 
                  color: '#fbbf24', 
                  padding: '8px', 
                  borderRadius: 'var(--radius-sm)' 
                }}
              >
                <Coffee size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Breakfast</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {currency}{todayRecord.breakfast?.rate || config.defaultBreakfastRate} / meal
                </div>
              </div>
            </div>

            {/* Persons Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
              <Users size={12} color="var(--text-muted)" />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>{todayRecord.breakfast?.persons || 1}p</span>
              <button 
                onClick={() => handlePersonsChange('breakfast', -1)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 4px', fontSize: '14px' }}
              >-</button>
              <button 
                onClick={() => handlePersonsChange('breakfast', 1)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 4px', fontSize: '14px' }}
              >+</button>
            </div>
          </div>

          {/* 3 Status Buttons: Delivered | Skipped (Carry-Over) | Extra */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '8px' }}>
            <button
              onClick={() => handleMealStatusChange('breakfast', 'delivered')}
              className={`ios-btn ${breakfastStatus === 'delivered' ? 'ios-btn-primary' : 'ios-btn-secondary'}`}
              style={{ 
                padding: '10px 6px', 
                fontSize: '12px',
                background: breakfastStatus === 'delivered' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined 
              }}
            >
              <Check size={14} />
              <span>Served</span>
            </button>

            <button
              onClick={() => handleMealStatusChange('breakfast', 'skipped')}
              className={`ios-btn ${breakfastStatus === 'skipped' ? 'ios-btn-secondary' : 'ios-btn-secondary'}`}
              style={{ 
                padding: '10px 6px', 
                fontSize: '12px',
                border: breakfastStatus === 'skipped' ? '1px solid #a78bfa' : undefined,
                background: breakfastStatus === 'skipped' ? 'rgba(139, 92, 246, 0.2)' : undefined,
                color: breakfastStatus === 'skipped' ? '#c4b5fd' : undefined
              }}
            >
              <span>⏭️ Skip (Carry)</span>
            </button>

            <button
              onClick={() => handleMealStatusChange('breakfast', 'extra')}
              className={`ios-btn ${breakfastStatus === 'extra' ? 'ios-btn-secondary' : 'ios-btn-secondary'}`}
              style={{ 
                padding: '10px 6px', 
                fontSize: '12px',
                background: breakfastStatus === 'extra' ? 'rgba(59, 130, 246, 0.2)' : undefined,
                border: breakfastStatus === 'extra' ? '1px solid #60a5fa' : undefined,
                color: breakfastStatus === 'extra' ? '#93c5fd' : undefined
              }}
            >
              <span>👥 Extra</span>
            </button>
          </div>

          {breakfastStatus === 'skipped' && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>✨</span> This breakfast will carry over and extend your package!
            </div>
          )}
        </div>
      )}

      {/* Lunch Card */}
      {incLunch && (
        <div className="ios-card" style={{ borderColor: lunchStatus === 'delivered' ? 'rgba(16, 185, 129, 0.4)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{ 
                  background: 'var(--accent-lunch-subtle)', 
                  color: '#34d399', 
                  padding: '8px', 
                  borderRadius: 'var(--radius-sm)' 
                }}
              >
                <UtensilsCrossed size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Lunch</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {currency}{todayRecord.lunch?.rate || config.defaultLunchRate} / meal
                </div>
              </div>
            </div>

            {/* Persons Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
              <Users size={12} color="var(--text-muted)" />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>{todayRecord.lunch?.persons || 1}p</span>
              <button 
                onClick={() => handlePersonsChange('lunch', -1)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 4px', fontSize: '14px' }}
              >-</button>
              <button 
                onClick={() => handlePersonsChange('lunch', 1)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 4px', fontSize: '14px' }}
              >+</button>
            </div>
          </div>

          {/* 3 Status Buttons: Delivered | Skipped (Carry-Over) | Extra */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '8px' }}>
            <button
              onClick={() => handleMealStatusChange('lunch', 'delivered')}
              className={`ios-btn ${lunchStatus === 'delivered' ? 'ios-btn-primary' : 'ios-btn-secondary'}`}
              style={{ padding: '10px 6px', fontSize: '12px' }}
            >
              <Check size={14} />
              <span>Served</span>
            </button>

            <button
              onClick={() => handleMealStatusChange('lunch', 'skipped')}
              className={`ios-btn ${lunchStatus === 'skipped' ? 'ios-btn-secondary' : 'ios-btn-secondary'}`}
              style={{ 
                padding: '10px 6px', 
                fontSize: '12px',
                border: lunchStatus === 'skipped' ? '1px solid #a78bfa' : undefined,
                background: lunchStatus === 'skipped' ? 'rgba(139, 92, 246, 0.2)' : undefined,
                color: lunchStatus === 'skipped' ? '#c4b5fd' : undefined
              }}
            >
              <span>⏭️ Skip (Carry)</span>
            </button>

            <button
              onClick={() => handleMealStatusChange('lunch', 'extra')}
              className={`ios-btn ${lunchStatus === 'extra' ? 'ios-btn-secondary' : 'ios-btn-secondary'}`}
              style={{ 
                padding: '10px 6px', 
                fontSize: '12px',
                background: lunchStatus === 'extra' ? 'rgba(59, 130, 246, 0.2)' : undefined,
                border: lunchStatus === 'extra' ? '1px solid #60a5fa' : undefined,
                color: lunchStatus === 'extra' ? '#93c5fd' : undefined
              }}
            >
              <span>👥 Extra</span>
            </button>
          </div>

          {lunchStatus === 'skipped' && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>✨</span> This lunch will carry over and extend your package!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
