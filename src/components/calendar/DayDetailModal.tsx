import React, { useState } from 'react';
import { DayRecord, MealStatus, RateConfig, PackagePlan } from '../../types';
import { X, Coffee, UtensilsCrossed, Users, Check, AlertCircle } from 'lucide-react';

interface DayDetailModalProps {
  dateStr: string;
  record?: DayRecord;
  config: RateConfig;
  activePackage: PackagePlan | null;
  onSave: (updatedRecord: DayRecord) => void;
  onClose: () => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  dateStr,
  record,
  config,
  activePackage,
  onSave,
  onClose,
}) => {
  const [bStatus, setBStatus] = useState<MealStatus>(record?.breakfast?.status || 'delivered');
  const [bPersons, setBPersons] = useState<number>(record?.breakfast?.persons || config.defaultPersons || 1);
  const [lStatus, setLStatus] = useState<MealStatus>(record?.lunch?.status || 'delivered');
  const [lPersons, setLPersons] = useState<number>(record?.lunch?.persons || config.defaultPersons || 1);
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
      setBStatus('skipped');
      setLStatus('skipped');
    }
  };

  const handleSave = () => {
    const updated: DayRecord = {
      date: dateStr,
      breakfast: {
        status: bStatus,
        persons: bPersons,
        rate: activePackage?.breakfastRate || config.defaultBreakfastRate,
        notes: bStatus === 'skipped' ? 'Carried over' : undefined,
      },
      lunch: {
        status: lStatus,
        persons: lPersons,
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Edit Date</div>
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

        {/* Breakfast Row */}
        <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coffee size={16} color="#fbbf24" />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Breakfast</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={12} color="var(--text-muted)" />
              <button onClick={() => setBPersons(Math.max(1, bPersons - 1))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '20px', height: '20px' }}>-</button>
              <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{bPersons}p</span>
              <button onClick={() => setBPersons(bPersons + 1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '20px', height: '20px' }}>+</button>
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
                {st === 'skipped' ? 'Skip ⏭️' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Lunch Row */}
        <div style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UtensilsCrossed size={16} color="#34d399" />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Lunch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={12} color="var(--text-muted)" />
              <button onClick={() => setLPersons(Math.max(1, lPersons - 1))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '20px', height: '20px' }}>-</button>
              <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{lPersons}p</span>
              <button onClick={() => setLPersons(lPersons + 1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '20px', height: '20px' }}>+</button>
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
                {st === 'skipped' ? 'Skip ⏭️' : st}
              </button>
            ))}
          </div>
        </div>

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

        <button 
          onClick={handleSave} 
          className="ios-btn ios-btn-primary" 
          style={{ width: '100%', marginTop: '8px' }}
        >
          <Check size={16} />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
