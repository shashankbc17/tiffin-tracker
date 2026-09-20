import React, { useState } from 'react';
import { DayRecord, MealStatus, RateConfig, PackagePlan } from '../../types';
import { X, Coffee, UtensilsCrossed, Users, Check, AlertCircle, Trash2 } from 'lucide-react';

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

  const [bStatus, setBStatus] = useState<MealStatus>(
    record?.breakfast?.status && record.breakfast.status !== 'none'
      ? record.breakfast.status
      : incBreakfast
      ? 'delivered'
      : 'none'
  );
  const [bPersons, setBPersons] = useState<number>(
    record?.breakfast?.persons && record.breakfast.persons > 0 ? record.breakfast.persons : planPersons
  );
  const [lStatus, setLStatus] = useState<MealStatus>(
    record?.lunch?.status && record.lunch.status !== 'none'
      ? record.lunch.status
      : incLunch
      ? 'delivered'
      : 'none'
  );
  const [lPersons, setLPersons] = useState<number>(
    record?.lunch?.persons && record.lunch.persons > 0 ? record.lunch.persons : planPersons
  );
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
    const nextVal = !isCookOff;
    setIsCookOff(nextVal);
    if (nextVal) {
      if (incBreakfast) setBStatus('skipped');
      if (incLunch) setLStatus('skipped');
    }
  };

  const handleSave = () => {
    const updated: DayRecord = {
      date: dateStr,
      breakfast: {
        status: incBreakfast ? bStatus : 'none',
        persons: incBreakfast ? bPersons : 0,
        rate: activePackage?.breakfastRate || config.defaultBreakfastRate,
        notes: bStatus === 'skipped' ? 'Carried over' : undefined,
      },
      lunch: {
        status: incLunch ? lStatus : 'none',
        persons: incLunch ? lPersons : 0,
        rate: activePackage?.lunchRate || config.defaultLunchRate,
        notes: lStatus === 'skipped' ? 'Carried over' : undefined,
      },
      isCookOff,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  const handleClear = () => {
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

  const hasLoggedMeals = (record?.breakfast?.status && record.breakfast.status !== 'none') ||
    (record?.lunch?.status && record.lunch.status !== 'none') ||
    record?.isCookOff;

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
            onClick={onClose} 
            style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

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

        {/* Breakfast Row (Only shown if Breakfast is opted in package) */}
        {incBreakfast && (
          <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coffee size={16} color="#fbbf24" />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Breakfast</span>
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
              {(['delivered', 'skipped', 'extra', 'none'] as MealStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setBStatus(st)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: 'var(--radius-xs)',
                    border: bStatus === st ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: bStatus === st ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: bStatus === st ? '#34d399' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {st === 'skipped' ? 'Skip ⏭️' : st === 'none' ? 'Unlog' : st}
                </button>
              ))}
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
              {(['delivered', 'skipped', 'extra', 'none'] as MealStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setLStatus(st)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: 'var(--radius-xs)',
                    border: lStatus === st ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: lStatus === st ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: lStatus === st ? '#34d399' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {st === 'skipped' ? 'Skip ⏭️' : st === 'none' ? 'Unlog' : st}
                </button>
              ))}
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
          {hasLoggedMeals && (
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
            onClick={handleSave} 
            className="ios-btn ios-btn-primary" 
            style={{ flex: 1 }}
          >
            <Check size={16} />
            <span>Confirm & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
