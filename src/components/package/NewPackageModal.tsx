import React, { useState } from 'react';
import { PackagePlan, RateConfig } from '../../types';
import { formatDate, addActiveDays } from '../../services/carryOverEngine';
import { X, Sparkles, Check, CalendarDays, Edit3 } from 'lucide-react';

interface NewPackageModalProps {
  config: RateConfig;
  onSavePackage: (pkg: PackagePlan) => void;
  onClose: () => void;
  initialPackage?: PackagePlan | null;
}

const DAYS_META = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

export const NewPackageModal: React.FC<NewPackageModalProps> = ({
  config,
  onSavePackage,
  onClose,
  initialPackage,
}) => {
  const currency = config.currency || '₹';
  const todayStr = formatDate(new Date());

  const [title, setTitle] = useState(initialPackage?.title || 'Monthly Tiffin Subscription');
  const [startDate, setStartDate] = useState(initialPackage?.startDate || todayStr);
  const [totalDays, setTotalDays] = useState(initialPackage?.totalDays || 30);
  const [activeDaysOfWeek, setActiveDaysOfWeek] = useState<number[]>(
    initialPackage?.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]
  );
  const [includesBreakfast, setIncludesBreakfast] = useState(
    initialPackage !== undefined && initialPackage !== null ? initialPackage.includesBreakfast : true
  );
  const [breakfastRate, setBreakfastRate] = useState(
    initialPackage?.breakfastRate || config.defaultBreakfastRate || 60
  );
  const [includesLunch, setIncludesLunch] = useState(
    initialPackage !== undefined && initialPackage !== null ? initialPackage.includesLunch : true
  );
  const [lunchRate, setLunchRate] = useState(
    initialPackage?.lunchRate || config.defaultLunchRate || 90
  );
  const [defaultPersons, setDefaultPersons] = useState(
    initialPackage?.defaultPersons || config.defaultPersons || 1
  );
  const [notes, setNotes] = useState(initialPackage?.notes || '');

  // Auto calculate expected total package amount
  const dailyPerPerson = (includesBreakfast ? breakfastRate : 0) + (includesLunch ? lunchRate : 0);
  const computedTotal = dailyPerPerson * defaultPersons * totalDays;
  const [amountPaid, setAmountPaid] = useState(initialPackage?.totalAmountPaid || computedTotal);

  const handleDaysPreset = (days: number) => {
    setTotalDays(days);
    setAmountPaid(dailyPerPerson * defaultPersons * days);
  };

  const handleSchedulePreset = (type: 'all' | 'weekdays' | 'mon-sat') => {
    if (type === 'all') {
      setActiveDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    } else if (type === 'weekdays') {
      setActiveDaysOfWeek([1, 2, 3, 4, 5]); // Mon - Fri
    } else if (type === 'mon-sat') {
      setActiveDaysOfWeek([1, 2, 3, 4, 5, 6]); // Mon - Sat (No Sun)
    }
  };

  const toggleDayOfWeek = (day: number) => {
    if (activeDaysOfWeek.includes(day)) {
      if (activeDaysOfWeek.length === 1) {
        alert('You must have at least one active delivery day per week!');
        return;
      }
      setActiveDaysOfWeek(activeDaysOfWeek.filter((d) => d !== day));
    } else {
      setActiveDaysOfWeek([...activeDaysOfWeek, day].sort());
    }
  };

  const projectedEndDate = addActiveDays(startDate, totalDays, activeDaysOfWeek);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPkg: PackagePlan = {
      id: initialPackage?.id || `pkg_${Date.now()}`,
      title: title.trim() || 'Tiffin Package',
      startDate,
      totalDays: Number(totalDays),
      activeDaysOfWeek,
      includesBreakfast,
      includesLunch,
      breakfastRate: Number(breakfastRate),
      lunchRate: Number(lunchRate),
      defaultPersons: Number(defaultPersons),
      totalAmountPaid: Number(amountPaid),
      status: initialPackage?.status || 'active',
      notes: notes.trim() || undefined,
    };
    onSavePackage(newPkg);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {initialPackage ? 'Modify Subscription' : 'New Plan'}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {initialPackage && <Edit3 size={18} color="var(--accent-primary)" />}
              <span>{initialPackage ? 'Edit Active Plan' : 'Subscribe Meal Package'}</span>
            </h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="ios-input-group">
            <label className="ios-label">Package Title</label>
            <input 
              type="text" 
              className="ios-input" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
            />
          </div>

          {/* Delivery Days of Week Selector */}
          <div className="ios-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="ios-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarDays size={14} color="var(--accent-primary)" />
                <span>Delivery Days in Week (Skipped Days Excluded)</span>
              </label>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                {activeDaysOfWeek.length} days/week
              </span>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', margin: '6px 0 8px 0' }}>
              <button
                type="button"
                onClick={() => handleSchedulePreset('mon-sat')}
                style={{
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-xs)',
                  border: activeDaysOfWeek.length === 6 && !activeDaysOfWeek.includes(0) ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: activeDaysOfWeek.length === 6 && !activeDaysOfWeek.includes(0) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: activeDaysOfWeek.length === 6 && !activeDaysOfWeek.includes(0) ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Mon - Sat (No Sun)
              </button>

              <button
                type="button"
                onClick={() => handleSchedulePreset('weekdays')}
                style={{
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-xs)',
                  border: activeDaysOfWeek.length === 5 && !activeDaysOfWeek.includes(0) && !activeDaysOfWeek.includes(6) ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: activeDaysOfWeek.length === 5 && !activeDaysOfWeek.includes(0) && !activeDaysOfWeek.includes(6) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: activeDaysOfWeek.length === 5 && !activeDaysOfWeek.includes(0) && !activeDaysOfWeek.includes(6) ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Mon - Fri (Weekdays)
              </button>

              <button
                type="button"
                onClick={() => handleSchedulePreset('all')}
                style={{
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-xs)',
                  border: activeDaysOfWeek.length === 7 ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: activeDaysOfWeek.length === 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: activeDaysOfWeek.length === 7 ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All 7 Days
              </button>
            </div>

            {/* Individual Day Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {DAYS_META.map(({ day, label }) => {
                const isActive = activeDaysOfWeek.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDayOfWeek(day)}
                    style={{
                      padding: '8px 0',
                      borderRadius: 'var(--radius-xs)',
                      border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                      background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
                      color: isActive ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Date */}
          <div className="ios-input-group">
            <label className="ios-label">Start Date</label>
            <input 
              type="date" 
              className="ios-input" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              required 
            />
          </div>

          {/* Days Presets */}
          <div className="ios-input-group">
            <label className="ios-label">Total Meal Days in Plan</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
              {[15, 20, 30, 45].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => handleDaysPreset(d)}
                  style={{
                    padding: '8px 0',
                    borderRadius: 'var(--radius-sm)',
                    border: totalDays === d ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    background: totalDays === d ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {d} Days
                </button>
              ))}
            </div>
            <input 
              type="number" 
              className="ios-input" 
              min={1} 
              value={totalDays} 
              onChange={(e) => {
                const val = Number(e.target.value);
                setTotalDays(val);
                setAmountPaid(dailyPerPerson * defaultPersons * val);
              }} 
              required 
            />
            <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '4px' }}>
              ⏳ Projected End Date: <strong>{projectedEndDate}</strong> (based on {activeDaysOfWeek.length} days/week schedule)
            </div>
          </div>

          {/* Meal Inclusions & Rates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#fbbf24', cursor: 'pointer', marginBottom: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={includesBreakfast} 
                  onChange={(e) => setIncludesBreakfast(e.target.checked)} 
                  style={{ accentColor: '#fbbf24' }} 
                />
                <span>🍳 Breakfast</span>
              </label>
              {includesBreakfast && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rate ({currency}/meal)</div>
                  <input 
                    type="number" 
                    className="ios-input" 
                    style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                    value={breakfastRate} 
                    onChange={(e) => setBreakfastRate(Number(e.target.value))} 
                  />
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#34d399', cursor: 'pointer', marginBottom: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={includesLunch} 
                  onChange={(e) => setIncludesLunch(e.target.checked)} 
                  style={{ accentColor: '#10b981' }} 
                />
                <span>🍱 Lunch</span>
              </label>
              {includesLunch && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rate ({currency}/meal)</div>
                  <input 
                    type="number" 
                    className="ios-input" 
                    style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                    value={lunchRate} 
                    onChange={(e) => setLunchRate(Number(e.target.value))} 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Persons Count */}
          <div className="ios-input-group">
            <label className="ios-label">Number of Persons</label>
            <input 
              type="number" 
              min={1} 
              className="ios-input" 
              value={defaultPersons} 
              onChange={(e) => setDefaultPersons(Number(e.target.value))} 
              required 
            />
          </div>

          {/* Total Upfront Cost Summary */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Computed Plan Amount:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '16px' }}>
                {currency}{computedTotal.toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ({defaultPersons} Person · {totalDays} Days · {dailyPerPerson}{currency}/day)
            </div>
          </div>

          <button type="submit" className="ios-btn ios-btn-primary" style={{ width: '100%' }}>
            {initialPackage ? <Check size={16} /> : <Sparkles size={16} />}
            <span>{initialPackage ? 'Save Plan Changes' : 'Start Subscription'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
