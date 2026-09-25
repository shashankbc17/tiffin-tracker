import React, { useState } from 'react';
import { DayRecord, MealStatus, RateConfig, PackagePlan } from '../../types';
import { getIstNow, addDays } from '../../services/carryOverEngine';
import { X, Coffee, UtensilsCrossed, Users, Check, AlertCircle, Trash2, Lock, Clock } from 'lucide-react';

interface DayDetailModalProps {
  dateStr: string;
  record?: DayRecord;
  config: RateConfig;
  activePackage: PackagePlan | null;
  onSave: (updatedRecord: DayRecord) => void;
  onClear?: (dateStr: string) => void;
  onClose: () => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  dateStr,
  record,
  config,
  activePackage,
  onSave,
  onClear,
  onClose,
}) => {
  const incBreakfast = activePackage ? activePackage.includesBreakfast !== false : true;
  const incLunch = activePackage ? activePackage.includesLunch !== false : true;
  const planPersons = activePackage?.defaultPersons || config.defaultPersons || 1;

  const { dateStr: todayStr } = getIstNow();
  const oneMonthAgoStr = addDays(todayStr, -30);
  const isOlderThan1Month = dateStr < oneMonthAgoStr;
  const isFutureDate = dateStr > todayStr;

  const [bStatus, setBStatus] = useState<MealStatus>(() => {
    const raw = record?.breakfast?.status;
    if (isFutureDate && (raw === 'delivered' || raw === 'extra')) return 'none';
    return raw && raw !== 'none' ? raw : 'none';
  });
  const [bPersons, setBPersons] = useState<number>(
    record?.breakfast?.persons && record.breakfast.persons > 0 ? record.breakfast.persons : planPersons
  );
  const [bMenuItem, setBMenuItem] = useState<string>(record?.breakfast?.menuItem || '');
  const [bAutoDelivered] = useState<boolean>(record?.breakfast?.autoDelivered || false);

  const [lStatus, setLStatus] = useState<MealStatus>(() => {
    const raw = record?.lunch?.status;
    if (isFutureDate && (raw === 'delivered' || raw === 'extra')) return 'none';
    return raw && raw !== 'none' ? raw : 'none';
  });
  const [lPersons, setLPersons] = useState<number>(
    record?.lunch?.persons && record.lunch.persons > 0 ? record.lunch.persons : planPersons
  );
  const [lMenuItem, setLMenuItem] = useState<string>(record?.lunch?.menuItem || '');
  const [lAutoDelivered] = useState<boolean>(record?.lunch?.autoDelivered || false);

  const [isCookOff, setIsCookOff] = useState<boolean>(record?.isCookOff || false);
  const [notes, setNotes] = useState<string>(record?.notes || '');

  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleCookOffToggle = () => {
    if (isOlderThan1Month) return;
    const nextVal = !isCookOff;
    setIsCookOff(nextVal);
    if (nextVal) {
      if (incBreakfast) setBStatus('skipped');
      if (incLunch) setLStatus('skipped');
    }
  };

  const handleQuickPreset = (type: 'delivered' | 'skipped' | 'none') => {
    if (isOlderThan1Month) return;
    if (isFutureDate && type === 'delivered') {
      alert("Cannot mark meals as delivered for future dates.");
      return;
    }
    if (incBreakfast) setBStatus(type);
    if (incLunch) setLStatus(type);
    if (type !== 'skipped') setIsCookOff(false);
  };

  const handleSave = () => {
    if (isOlderThan1Month) return;

    if (isFutureDate && (bStatus === 'delivered' || bStatus === 'extra' || lStatus === 'delivered' || lStatus === 'extra')) {
      alert('Future dates cannot be marked as delivered since meals have not occurred yet.');
      return;
    }

    // If both meals are 'none' and cook is not off, clear record
    const hasAnyLogged = (incBreakfast && bStatus !== 'none') || (incLunch && lStatus !== 'none') || isCookOff;
    if (!hasAnyLogged) {
      if (onClear) {
        onClear(dateStr);
      } else {
        onSave({
          date: dateStr,
          breakfast: { status: 'none', persons: planPersons, rate: config.defaultBreakfastRate },
          lunch: { status: 'none', persons: planPersons, rate: config.defaultLunchRate },
          isCookOff: false,
          updatedAt: new Date().toISOString(),
        });
      }
      onClose();
      return;
    }

    const updated: DayRecord = {
      date: dateStr,
      breakfast: {
        status: incBreakfast ? bStatus : 'none',
        persons: incBreakfast ? bPersons : 0,
        rate: activePackage?.breakfastRate || config.defaultBreakfastRate,
        notes: bStatus === 'skipped' ? 'Carried over' : undefined,
        menuItem: bMenuItem.trim() || undefined,
        autoDelivered: bAutoDelivered,
      },
      lunch: {
        status: incLunch ? lStatus : 'none',
        persons: incLunch ? lPersons : 0,
        rate: activePackage?.lunchRate || config.defaultLunchRate,
        notes: lStatus === 'skipped' ? 'Carried over' : undefined,
        menuItem: lMenuItem.trim() || undefined,
        autoDelivered: lAutoDelivered,
      },
      isCookOff,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleClear = () => {
    if (isOlderThan1Month) return;
    if (onClear) {
      onClear(dateStr);
    } else {
      onSave({
        date: dateStr,
        breakfast: { status: 'none', persons: planPersons, rate: config.defaultBreakfastRate },
        lunch: { status: 'none', persons: planPersons, rate: config.defaultLunchRate },
        isCookOff: false,
      });
    }
    onClose();
  };

  const hasLoggedMeals = Boolean(
    (record?.breakfast?.status && record.breakfast.status !== 'none') ||
    (record?.lunch?.status && record.lunch.status !== 'none') ||
    record?.isCookOff ||
    (bStatus && bStatus !== 'none') ||
    (lStatus && lStatus !== 'none') ||
    isCookOff
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confirm Date</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{formattedDate}</h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="modal-close-icon-btn"
            title="Cancel & Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1-Month Edit Limit Lock Banner */}
        {isOlderThan1Month && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              color: '#fca5a5',
              fontSize: '11.5px',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <Lock size={15} style={{ flexShrink: 0, color: '#f87171' }} />
            <span>
              <strong>Read-Only Archive:</strong> Records older than 1 month ({oneMonthAgoStr}) are locked to preserve accounting and billing integrity.
            </span>
          </div>
        )}

        {/* Future Date Notification Banner */}
        {isFutureDate && (
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              color: '#93c5fd',
              fontSize: '11.5px',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <Clock size={15} style={{ flexShrink: 0, color: '#60a5fa' }} />
            <span>
              <strong>Future Date:</strong> Delivered status is disabled because meals have not occurred yet. You can plan skips or cook leave in advance.
            </span>
          </div>
        )}

        {/* Cook Holiday Quick Toggle */}
        <div 
          onClick={handleCookOffToggle}
          style={{ 
            padding: '12px 14px', 
            borderRadius: 'var(--radius-md)', 
            background: isCookOff ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: isCookOff ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color={isCookOff ? '#f87171' : 'var(--text-muted)'} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: isCookOff ? '#f87171' : 'var(--text-primary)' }}>
              Cook Holiday / Leave (Auto Carry-over)
            </span>
          </div>
          <input type="checkbox" checked={isCookOff} onChange={() => {}} style={{ accentColor: '#ef4444' }} />
        </div>

        {/* Quick Fill Presets */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => handleQuickPreset('delivered')}
            disabled={isOlderThan1Month || isFutureDate}
            className="ios-btn ios-btn-secondary"
            style={{ 
              flex: 1, 
              padding: '8px 10px', 
              fontSize: '11.5px', 
              borderRadius: 'var(--radius-sm)', 
              border: isFutureDate ? '1px dashed rgba(255, 255, 255, 0.15)' : '1px solid rgba(16, 185, 129, 0.3)', 
              color: isFutureDate ? 'var(--text-muted)' : '#34d399',
              opacity: isFutureDate || isOlderThan1Month ? 0.35 : 1,
              cursor: isFutureDate || isOlderThan1Month ? 'not-allowed' : 'pointer'
            }}
            title={isFutureDate ? "Delivered status is disabled for future dates" : "Mark Delivered"}
          >
            Mark Delivered
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('skipped')}
            className="ios-btn ios-btn-secondary"
            style={{ flex: 1, padding: '8px 10px', fontSize: '11.5px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd' }}
          >
            Mark Skipped ⏭️
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('none')}
            className="ios-btn ios-btn-secondary"
            style={{ padding: '8px 10px', fontSize: '11.5px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
            title="Reset to unlogged"
          >
            Reset
          </button>
        </div>

        {/* Breakfast Row (Only shown if Breakfast is opted in package) */}
        {incBreakfast && (
          <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coffee size={16} color="#fbbf24" />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Breakfast</span>
                {bAutoDelivered && (
                  <span style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                    ⚡ Auto
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={12} color="var(--text-muted)" />
                <button 
                  onClick={() => setBPersons(Math.max(1, bPersons - 1))} 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer' }}
                >
                  -
                </button>
                <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '24px', textAlign: 'center', color: bPersons < planPersons ? '#fbbf24' : 'white' }}>
                  {bPersons}p
                </span>
                <button 
                  onClick={() => setBPersons(bStatus === 'extra' ? bPersons + 1 : Math.min(planPersons, bPersons + 1))} 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(['delivered', 'skipped', 'extra', 'none'] as MealStatus[]).map((st) => {
                const isDeliveredType = st === 'delivered' || st === 'extra';
                const isOptionDisabled = isOlderThan1Month || (isFutureDate && isDeliveredType);
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={isOptionDisabled}
                    onClick={() => {
                      if (isOptionDisabled) return;
                      setBStatus(st);
                    }}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 'var(--radius-xs)',
                      border: bStatus === st ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                      background: bStatus === st ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: isOptionDisabled ? 'var(--text-muted)' : bStatus === st ? '#34d399' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      cursor: isOptionDisabled ? 'not-allowed' : 'pointer',
                      opacity: isOptionDisabled ? 0.35 : 1,
                    }}
                    title={isFutureDate && isDeliveredType ? 'Cannot mark delivered for future dates' : undefined}
                  >
                    {st === 'skipped' ? 'Skip ⏭️' : st === 'none' ? 'Unlog' : st}
                  </button>
                );
              })}
            </div>

            {/* Breakfast Dish / Menu Input */}
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                className="ios-input"
                style={{ padding: '7px 10px', fontSize: '12px' }}
                placeholder="What was sent? e.g. Idli Vada, Poha, Upma"
                value={bMenuItem}
                onChange={(e) => setBMenuItem(e.target.value)}
              />
            </div>

            {/* Partial Delivery Carryover Callout */}
            {bStatus === 'delivered' && bPersons < planPersons && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#c4b5fd', background: 'rgba(139, 92, 246, 0.15)', padding: '5px 8px', borderRadius: '6px' }}>
                💡 Delivered to {bPersons} of {planPersons} persons. {planPersons - bPersons} person portion carried forward!
              </div>
            )}
          </div>
        )}

        {/* Lunch Row (Only shown if Lunch is opted in package) */}
        {incLunch && (
          <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UtensilsCrossed size={16} color="#34d399" />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Lunch</span>
                {lAutoDelivered && (
                  <span style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                    ⚡ Auto
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={12} color="var(--text-muted)" />
                <button 
                  onClick={() => setLPersons(Math.max(1, lPersons - 1))} 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer' }}
                >
                  -
                </button>
                <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '24px', textAlign: 'center', color: lPersons < planPersons ? '#34d399' : 'white' }}>
                  {lPersons}p
                </span>
                <button 
                  onClick={() => setLPersons(lStatus === 'extra' ? lPersons + 1 : Math.min(planPersons, lPersons + 1))} 
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(['delivered', 'skipped', 'extra', 'none'] as MealStatus[]).map((st) => {
                const isDeliveredType = st === 'delivered' || st === 'extra';
                const isOptionDisabled = isOlderThan1Month || (isFutureDate && isDeliveredType);
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={isOptionDisabled}
                    onClick={() => {
                      if (isOptionDisabled) return;
                      setLStatus(st);
                    }}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 'var(--radius-xs)',
                      border: lStatus === st ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                      background: lStatus === st ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: isOptionDisabled ? 'var(--text-muted)' : lStatus === st ? '#34d399' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      cursor: isOptionDisabled ? 'not-allowed' : 'pointer',
                      opacity: isOptionDisabled ? 0.35 : 1,
                    }}
                    title={isFutureDate && isDeliveredType ? 'Cannot mark delivered for future dates' : undefined}
                  >
                    {st === 'skipped' ? 'Skip ⏭️' : st === 'none' ? 'Unlog' : st}
                  </button>
                );
              })}
            </div>

            {/* Lunch Dish / Menu Input */}
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                className="ios-input"
                style={{ padding: '7px 10px', fontSize: '12px' }}
                placeholder="What was sent? e.g. Dal Roti, Rice, Paneer"
                value={lMenuItem}
                onChange={(e) => setLMenuItem(e.target.value)}
              />
            </div>

            {/* Partial Delivery Carryover Callout */}
            {lStatus === 'delivered' && lPersons < planPersons && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#c4b5fd', background: 'rgba(139, 92, 246, 0.15)', padding: '5px 8px', borderRadius: '6px' }}>
                💡 Delivered to {lPersons} of {planPersons} persons. {planPersons - lPersons} person portion carried forward!
              </div>
            )}
          </div>
        )}

        {/* Note input */}
        <div className="ios-input-group">
          <label className="ios-label">Note (optional)</label>
          <input 
            type="text" 
            className="ios-input" 
            placeholder="e.g. Office dinner, guest extra, cook sick" 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {hasLoggedMeals && !isOlderThan1Month && (
            <button
              type="button"
              onClick={handleClear}
              className="ios-btn ios-btn-secondary"
              style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '12px 14px' }}
              title="Clear meals for this date"
            >
              <Trash2 size={16} />
              <span>Clear</span>
            </button>
          )}

          <button 
            type="button"
            onClick={isOlderThan1Month ? undefined : handleSave} 
            disabled={isOlderThan1Month}
            className="ios-btn ios-btn-primary" 
            style={{
              flex: 1,
              opacity: isOlderThan1Month ? 0.45 : 1,
              cursor: isOlderThan1Month ? 'not-allowed' : 'pointer'
            }}
          >
            {isOlderThan1Month ? <Lock size={16} /> : <Check size={16} />}
            <span>{isOlderThan1Month ? 'Archived (Locked)' : 'Confirm & Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
