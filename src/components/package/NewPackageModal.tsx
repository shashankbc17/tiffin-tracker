import React, { useState } from 'react';
import { PackagePlan, RateConfig } from '../../types';
import { formatDate, addActiveDays } from '../../services/carryOverEngine';
import { X, Sparkles, Check, CalendarDays, Edit3, SlidersHorizontal, Coffee, Utensils } from 'lucide-react';

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

  const [title, setTitle] = useState(initialPackage?.title || 'Meal Subscription');
  const [startDate, setStartDate] = useState(initialPackage?.startDate || todayStr);

  // String states for numeric fields to prevent iPhone "stuck on 0" bug
  const [totalDaysStr, setTotalDaysStr] = useState(String(initialPackage?.totalDays || 30));
  const [breakfastRateStr, setBreakfastRateStr] = useState(
    String(initialPackage?.breakfastRate ?? config.defaultBreakfastRate ?? 60)
  );
  const [lunchRateStr, setLunchRateStr] = useState(
    String(initialPackage?.lunchRate ?? config.defaultLunchRate ?? 90)
  );
  const [defaultPersonsStr, setDefaultPersonsStr] = useState(
    String(initialPackage?.defaultPersons ?? config.defaultPersons ?? 1)
  );

  const [includesBreakfast, setIncludesBreakfast] = useState(
    initialPackage !== undefined && initialPackage !== null ? initialPackage.includesBreakfast : true
  );
  const [includesLunch, setIncludesLunch] = useState(
    initialPackage !== undefined && initialPackage !== null ? initialPackage.includesLunch : true
  );

  // Separate day preference for Breakfast & Lunch
  const hasSeparateInit = Boolean(
    initialPackage?.breakfastDaysOfWeek &&
    initialPackage?.lunchDaysOfWeek &&
    JSON.stringify(initialPackage.breakfastDaysOfWeek) !== JSON.stringify(initialPackage.lunchDaysOfWeek)
  );
  const [separateMealDays, setSeparateMealDays] = useState(hasSeparateInit);

  const [activeDaysOfWeek, setActiveDaysOfWeek] = useState<number[]>(
    initialPackage?.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]
  );
  const [breakfastDaysOfWeek, setBreakfastDaysOfWeek] = useState<number[]>(
    initialPackage?.breakfastDaysOfWeek || initialPackage?.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]
  );
  const [lunchDaysOfWeek, setLunchDaysOfWeek] = useState<number[]>(
    initialPackage?.lunchDaysOfWeek || initialPackage?.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]
  );

  const [notes, setNotes] = useState(initialPackage?.notes || '');

  // Derived numeric values
  const totalDays = Math.max(1, parseInt(totalDaysStr, 10) || 30);
  const breakfastRate = Math.max(0, parseInt(breakfastRateStr, 10) || 0);
  const lunchRate = Math.max(0, parseInt(lunchRateStr, 10) || 0);
  const defaultPersons = Math.max(1, parseInt(defaultPersonsStr, 10) || 1);

  const dailyPerPerson = (includesBreakfast ? breakfastRate : 0) + (includesLunch ? lunchRate : 0);
  const computedTotal = dailyPerPerson * defaultPersons * totalDays;

  // Union of active days when separate is enabled
  const combinedDaysOfWeek = separateMealDays
    ? Array.from(new Set([...breakfastDaysOfWeek, ...lunchDaysOfWeek])).sort()
    : activeDaysOfWeek;

  const handleDaysPreset = (days: number) => {
    setTotalDaysStr(String(days));
  };

  const handleSchedulePreset = (
    type: 'all' | 'weekdays' | 'mon-sat',
    target: 'combined' | 'breakfast' | 'lunch' = 'combined'
  ) => {
    const list =
      type === 'all'
        ? [0, 1, 2, 3, 4, 5, 6]
        : type === 'weekdays'
        ? [1, 2, 3, 4, 5]
        : [1, 2, 3, 4, 5, 6];

    if (target === 'combined') {
      setActiveDaysOfWeek(list);
      setBreakfastDaysOfWeek(list);
      setLunchDaysOfWeek(list);
    } else if (target === 'breakfast') {
      setBreakfastDaysOfWeek(list);
    } else {
      setLunchDaysOfWeek(list);
    }
  };

  const toggleDayOfWeek = (
    day: number,
    target: 'combined' | 'breakfast' | 'lunch' = 'combined'
  ) => {
    const updateList = (prev: number[]) => {
      if (prev.includes(day)) {
        if (prev.length === 1) {
          alert('You must have at least one active delivery day!');
          return prev;
        }
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day].sort();
      }
    };

    if (target === 'combined') {
      const next = updateList(activeDaysOfWeek);
      setActiveDaysOfWeek(next);
      setBreakfastDaysOfWeek(next);
      setLunchDaysOfWeek(next);
    } else if (target === 'breakfast') {
      setBreakfastDaysOfWeek(updateList);
    } else {
      setLunchDaysOfWeek(updateList);
    }
  };

  const projectedEndDate = addActiveDays(startDate, totalDays, combinedDaysOfWeek);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBreakfastDays = separateMealDays ? breakfastDaysOfWeek : activeDaysOfWeek;
    const finalLunchDays = separateMealDays ? lunchDaysOfWeek : activeDaysOfWeek;
    const finalActiveDays = separateMealDays ? combinedDaysOfWeek : activeDaysOfWeek;

    const newPkg: PackagePlan = {
      id: initialPackage?.id || `pkg_${Date.now()}`,
      title: title.trim() || 'Tiffin Package',
      startDate,
      totalDays,
      activeDaysOfWeek: finalActiveDays,
      breakfastDaysOfWeek: includesBreakfast ? finalBreakfastDays : undefined,
      lunchDaysOfWeek: includesLunch ? finalLunchDays : undefined,
      includesBreakfast,
      includesLunch,
      breakfastRate,
      lunchRate,
      defaultPersons,
      totalAmountPaid: computedTotal,
      status: initialPackage?.status || 'active',
      notes: notes.trim() || undefined,
    };
    onSavePackage(newPkg);
    onClose();
  };

  // Helper for rendering day-of-week button row
  const renderDayPicker = (
    currentList: number[],
    target: 'combined' | 'breakfast' | 'lunch',
    accentColor = 'var(--accent-primary)'
  ) => (
    <div>
      {/* Quick Presets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', margin: '6px 0 8px 0' }}>
        <button
          type="button"
          onClick={() => handleSchedulePreset('mon-sat', target)}
          style={{
            padding: '6px 4px',
            borderRadius: 'var(--radius-xs)',
            border: currentList.length === 6 && !currentList.includes(0) ? `1px solid ${accentColor}` : '1px solid var(--glass-border)',
            background: currentList.length === 6 && !currentList.includes(0) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
            color: currentList.length === 6 && !currentList.includes(0) ? '#34d399' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Mon - Sat
        </button>

        <button
          type="button"
          onClick={() => handleSchedulePreset('weekdays', target)}
          style={{
            padding: '6px 4px',
            borderRadius: 'var(--radius-xs)',
            border: currentList.length === 5 && !currentList.includes(0) && !currentList.includes(6) ? `1px solid ${accentColor}` : '1px solid var(--glass-border)',
            background: currentList.length === 5 && !currentList.includes(0) && !currentList.includes(6) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
            color: currentList.length === 5 && !currentList.includes(0) && !currentList.includes(6) ? '#34d399' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Mon - Fri
        </button>

        <button
          type="button"
          onClick={() => handleSchedulePreset('all', target)}
          style={{
            padding: '6px 4px',
            borderRadius: 'var(--radius-xs)',
            border: currentList.length === 7 ? `1px solid ${accentColor}` : '1px solid var(--glass-border)',
            background: currentList.length === 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
            color: currentList.length === 7 ? '#34d399' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          All 7 Days
        </button>
      </div>

      {/* Day pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {DAYS_META.map(({ day, label }) => {
          const isActive = currentList.includes(day);
          return (
            <button
              type="button"
              key={day}
              onClick={() => toggleDayOfWeek(day, target)}
              style={{
                padding: '8px 0',
                borderRadius: 'var(--radius-xs)',
                border: isActive ? `1px solid ${accentColor}` : '1px solid var(--glass-border)',
                background: isActive ? accentColor : 'rgba(255,255,255,0.04)',
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
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sheet-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {initialPackage ? 'Modify Subscription' : 'New Plan'}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {initialPackage && <Edit3 size={18} color="var(--accent-primary)" />}
              <span>{initialPackage ? 'Edit Plan' : 'Subscribe Meal Package'}</span>
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
              placeholder="e.g. Daily Breakfast & Lunch"
              required 
            />
          </div>

          {/* Delivery Days of Week Selector */}
          <div className="ios-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="ios-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <CalendarDays size={14} color="var(--accent-primary)" />
                <span>Delivery Days in Week</span>
              </label>

              {/* Toggle for separate breakfast and lunch days */}
              {includesBreakfast && includesLunch && (
                <button
                  type="button"
                  onClick={() => setSeparateMealDays(!separateMealDays)}
                  style={{
                    background: separateMealDays ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: separateMealDays ? '1px solid #3b82f6' : '1px solid var(--glass-border)',
                    color: separateMealDays ? '#93c5fd' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <SlidersHorizontal size={11} />
                  <span>{separateMealDays ? 'Different Days for B & L' : 'Same Days for B & L'}</span>
                </button>
              )}
            </div>

            {!separateMealDays || !includesBreakfast || !includesLunch ? (
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
                  {activeDaysOfWeek.length} days/week scheduled
                </div>
                {renderDayPicker(activeDaysOfWeek, 'combined', 'var(--accent-primary)')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                {/* Breakfast Days */}
                <div style={{ background: 'rgba(251, 191, 36, 0.06)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Coffee size={13} /> Breakfast Schedule
                    </span>
                    <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>
                      {breakfastDaysOfWeek.length} days/week
                    </span>
                  </div>
                  {renderDayPicker(breakfastDaysOfWeek, 'breakfast', '#d97706')}
                </div>

                {/* Lunch Days */}
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Utensils size={13} /> Lunch Schedule
                    </span>
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                      {lunchDaysOfWeek.length} days/week
                    </span>
                  </div>
                  {renderDayPicker(lunchDaysOfWeek, 'lunch', '#059669')}
                </div>
              </div>
            )}
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

          {/* Days Presets with iPhone 0-bug protection */}
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
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="ios-input" 
              value={totalDaysStr} 
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*$/.test(val)) {
                  setTotalDaysStr(val);
                }
              }} 
              required 
            />
            <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '4px' }}>
              ⏳ Projected End Date: <strong>{projectedEndDate}</strong>
            </div>
          </div>

          {/* Meal Inclusions & Rates with iPhone 0-bug protection */}
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
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="ios-input" 
                    style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                    value={breakfastRateStr} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        setBreakfastRateStr(val);
                      }
                    }} 
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
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="ios-input" 
                    style={{ padding: '6px 10px', fontSize: '13px', marginTop: '4px' }}
                    value={lunchRateStr} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        setLunchRateStr(val);
                      }
                    }} 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Persons Count with iPhone 0-bug protection */}
          <div className="ios-input-group">
            <label className="ios-label">Number of Persons</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              className="ios-input" 
              value={defaultPersonsStr} 
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*$/.test(val)) {
                  setDefaultPersonsStr(val);
                }
              }} 
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
