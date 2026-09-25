import React, { useState } from 'react';
import { PackagePlan, RateConfig } from '../../types';
import {
  formatDate,
  addActiveDays,
  countActiveDaysBetween,
  addDays,
  getIstNow,
  isDayActiveInPackage,
} from '../../services/carryOverEngine';
import {
  X,
  Sparkles,
  Check,
  CalendarDays,
  Calendar,
  Clock,
  Edit3,
  SlidersHorizontal,
  Coffee,
  Utensils,
  AlertTriangle,
} from 'lucide-react';

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
  const { dateStr: todayStr, hour: istHour } = getIstNow();
  const breakfastCutoff = config.breakfastCutoffHour ?? 11;
  const lunchCutoff = config.lunchCutoffHour ?? 15;

  // Default start date: today if creating new, or existing package start date
  const defaultStartDate = initialPackage?.startDate || todayStr;

  const [title, setTitle] = useState(initialPackage?.title || 'Meal Subscription');
  const [startDate, setStartDate] = useState(defaultStartDate);

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



  const initDays = initialPackage?.totalDays || 30;
  const initStart = initialPackage?.startDate || todayStr;
  const initActiveDays = initialPackage?.activeDaysOfWeek || [1, 2, 3, 4, 5, 6];
  const [endDate, setEndDate] = useState<string>(() => {
    return addActiveDays(initStart, initDays, initActiveDays);
  });

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (!newStart) return;
    if (endDate && endDate >= newStart) {
      const activeCount = countActiveDaysBetween(newStart, endDate, combinedDaysOfWeek);
      setTotalDaysStr(String(Math.max(1, activeCount)));
    } else {
      const newEnd = addActiveDays(newStart, totalDays, combinedDaysOfWeek);
      setEndDate(newEnd);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (!newEnd || !startDate) return;
    if (newEnd >= startDate) {
      const activeCount = countActiveDaysBetween(startDate, newEnd, combinedDaysOfWeek);
      setTotalDaysStr(String(Math.max(1, activeCount)));
    }
  };

  const handleTotalDaysChange = (newDaysStr: string) => {
    setTotalDaysStr(newDaysStr);
    const parsed = parseInt(newDaysStr, 10);
    if (!isNaN(parsed) && parsed > 0 && startDate) {
      const newEnd = addActiveDays(startDate, parsed, combinedDaysOfWeek);
      setEndDate(newEnd);
    }
  };

  const handleScheduleDaysUpdated = (updatedDays: number[]) => {
    if (startDate && endDate && endDate >= startDate) {
      const activeCount = countActiveDaysBetween(startDate, endDate, updatedDays);
      setTotalDaysStr(String(Math.max(1, activeCount)));
    } else if (startDate && totalDays > 0) {
      const newEnd = addActiveDays(startDate, totalDays, updatedDays);
      setEndDate(newEnd);
    }
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
      handleScheduleDaysUpdated(list);
    } else if (target === 'breakfast') {
      setBreakfastDaysOfWeek(list);
      const combined = Array.from(new Set([...list, ...lunchDaysOfWeek])).sort();
      handleScheduleDaysUpdated(combined);
    } else {
      setLunchDaysOfWeek(list);
      const combined = Array.from(new Set([...breakfastDaysOfWeek, ...list])).sort();
      handleScheduleDaysUpdated(combined);
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
      handleScheduleDaysUpdated(next);
    } else if (target === 'breakfast') {
      setBreakfastDaysOfWeek(prev => {
        const next = updateList(prev);
        const combined = Array.from(new Set([...next, ...lunchDaysOfWeek])).sort();
        handleScheduleDaysUpdated(combined);
        return next;
      });
    } else {
      setLunchDaysOfWeek(prev => {
        const next = updateList(prev);
        const combined = Array.from(new Set([...breakfastDaysOfWeek, ...next])).sort();
        handleScheduleDaysUpdated(combined);
        return next;
      });
    }
  };

  const projectedEndDate = addActiveDays(startDate, totalDays, combinedDaysOfWeek);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!includesBreakfast && !includesLunch) {
      alert('Please select at least Breakfast or Lunch for the plan.');
      return;
    }
    const finalBreakfastDays = separateMealDays ? breakfastDaysOfWeek : activeDaysOfWeek;
    const finalLunchDays = separateMealDays ? lunchDaysOfWeek : activeDaysOfWeek;
    const finalActiveDays = separateMealDays ? combinedDaysOfWeek : activeDaysOfWeek;

    const finalStartDate = startDate;

    const newPkg: PackagePlan = {
      id: initialPackage?.id || `pkg_${Date.now()}`,
      title: title.trim() || 'Tiffin Package',
      startDate: finalStartDate,
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
      createdAt: initialPackage?.createdAt || new Date().toISOString(),
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
            className="modal-close-icon-btn"
            title="Close"
            aria-label="Close"
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

          {/* Subscription Start Date, End Date & Package Days */}
          <div
            style={{
              background: 'var(--metric-card-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              {/* Start Date */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label className="ios-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0, fontSize: '11.5px' }}>
                    <Calendar size={13} color="var(--accent-primary)" />
                    <span>Start Date</span>
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartDateChange(todayStr)}
                      style={{
                        background: startDate === todayStr ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: startDate === todayStr ? '1px solid #10b981' : '1px solid var(--glass-border)',
                        color: startDate === todayStr ? '#34d399' : 'var(--text-muted)',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartDateChange(addDays(todayStr, 1))}
                      style={{
                        background: startDate === addDays(todayStr, 1) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: startDate === addDays(todayStr, 1) ? '1px solid #3b82f6' : '1px solid var(--glass-border)',
                        color: startDate === addDays(todayStr, 1) ? '#93c5fd' : 'var(--text-muted)',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      Tmrw
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  className="ios-input"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="ios-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '11.5px' }}>
                  <Calendar size={13} color="var(--accent-carryover)" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  className="ios-input"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                />
              </div>

              {/* Package Days */}
              <div>
                <label className="ios-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontSize: '11.5px' }}>
                  <CalendarDays size={13} color="var(--accent-lunch)" />
                  <span>Active Days</span>
                </label>
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
                      handleTotalDaysChange(val);
                    }
                  }}
                  style={{ width: '100%', fontSize: '14px', fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            {/* Live Synchronized Range Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span>
                Span: <strong style={{ color: 'var(--text-primary)' }}>{startDate}</strong> to{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{endDate}</strong>
              </span>
              <span style={{ color: 'var(--accent-lunch)', fontWeight: 700 }}>
                ⚡ {totalDays} scheduled delivery days
              </span>
            </div>

            {/* If today or past date is selected */}
            {startDate <= todayStr && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#93c5fd',
                  fontSize: '11.5px',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <Sparkles size={15} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>{startDate === todayStr ? 'Starting Today:' : 'Past Start Date Selected:'}</strong> Active meals based on your opted schedule from <strong>{startDate}</strong> up to today will be recorded as delivered for {defaultPersons} {defaultPersons > 1 ? 'persons' : 'person'} by default and deducted from your plan balance. You can edit any day later from the history.
                </span>
              </div>
            )}
          </div>

          {/* Delivery Schedule Days right below */}
          <div className="ios-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="ios-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <CalendarDays size={14} color="var(--accent-primary)" />
                <span>Delivery Schedule Days</span>
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

            {/* Presets Bar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {[
                { label: 'Mon–Sat (6D)', type: 'mon-sat' as const },
                { label: 'Mon–Fri (5D)', type: 'weekdays' as const },
                { label: 'All 7 Days', type: 'all' as const },
              ].map((p) => {
                const isSelected =
                  p.type === 'all'
                    ? activeDaysOfWeek.length === 7
                    : p.type === 'weekdays'
                    ? activeDaysOfWeek.length === 5 && !activeDaysOfWeek.includes(0) && !activeDaysOfWeek.includes(6)
                    : activeDaysOfWeek.length === 6 && !activeDaysOfWeek.includes(0);

                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => handleSchedulePreset(p.type, 'combined')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent-lunch)' : '1px solid var(--glass-border)',
                      background: isSelected ? 'var(--accent-lunch-subtle)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? 'var(--accent-lunch)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {!separateMealDays || !includesBreakfast || !includesLunch ? (
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>
                  {activeDaysOfWeek.length} days/week scheduled (Meals arrive on selected days)
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

          {/* Meal Types to Include - Plush Buttons */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                Included Meals
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tap card to add / remove
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Breakfast Plush Button */}
              <button
                type="button"
                onClick={() => setIncludesBreakfast(!includesBreakfast)}
                style={{
                  padding: '16px 10px',
                  borderRadius: '16px',
                  border: includesBreakfast
                    ? '2px solid #f59e0b'
                    : '2px dashed var(--glass-border)',
                  background: includesBreakfast
                    ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.08) 100%)'
                    : 'var(--metric-card-bg)',
                  boxShadow: includesBreakfast
                    ? '0 6px 18px rgba(245, 158, 11, 0.22)'
                    : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: includesBreakfast ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Indicator Icon */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: includesBreakfast ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                    border: includesBreakfast ? 'none' : '1.5px solid var(--text-muted)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {includesBreakfast ? <Check size={18} strokeWidth={3} /> : null}
                </div>

                <div style={{ fontSize: '28px', lineHeight: 1 }}>🍳</div>

                <div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: includesBreakfast ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    Breakfast
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: includesBreakfast ? '#f59e0b' : 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {currency}{breakfastRate}/plate
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: includesBreakfast ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: includesBreakfast ? '#f59e0b' : 'var(--text-muted)',
                  }}
                >
                  {includesBreakfast ? '✓ Selected' : '+ Tap to Select'}
                </span>
              </button>

              {/* Lunch Plush Button */}
              <button
                type="button"
                onClick={() => setIncludesLunch(!includesLunch)}
                style={{
                  padding: '16px 10px',
                  borderRadius: '16px',
                  border: includesLunch
                    ? '2px solid #10b981'
                    : '2px dashed var(--glass-border)',
                  background: includesLunch
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.08) 100%)'
                    : 'var(--metric-card-bg)',
                  boxShadow: includesLunch
                    ? '0 6px 18px rgba(16, 185, 129, 0.22)'
                    : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: includesLunch ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {/* Indicator Icon */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: includesLunch ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                    border: includesLunch ? 'none' : '1.5px solid var(--text-muted)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {includesLunch ? <Check size={18} strokeWidth={3} /> : null}
                </div>

                <div style={{ fontSize: '28px', lineHeight: 1 }}>🍱</div>

                <div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: includesLunch ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    Lunch
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: includesLunch ? '#10b981' : 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {currency}{lunchRate}/plate
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: includesLunch ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: includesLunch ? '#10b981' : 'var(--text-muted)',
                  }}
                >
                  {includesLunch ? '✓ Selected' : '+ Tap to Select'}
                </span>
              </button>
            </div>
          </div>

          {/* Rates and Persons with iPhone 0-bug protection */}
          {(includesBreakfast || includesLunch) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {includesBreakfast && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>
                    Breakfast Rate ({currency})
                  </label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="ios-input" 
                    style={{ padding: '8px 10px', fontSize: '13px', textAlign: 'center' }}
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

              {includesLunch && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>
                    Lunch Rate ({currency})
                  </label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="ios-input" 
                    style={{ padding: '8px 10px', fontSize: '13px', textAlign: 'center' }}
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

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>
                  Number of Persons
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="ios-input" 
                  style={{ padding: '8px 10px', fontSize: '13px', textAlign: 'center' }}
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
            </div>
          )}

          {/* Warning banner when neither meal is selected */}
          {!includesBreakfast && !includesLunch && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={16} />
              <span>Please tap Breakfast or Lunch above to activate this subscription</span>
            </div>
          )}

          {/* Total Upfront Cost Summary */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Computed Plan Amount:</span>
              <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '17px' }}>
                {currency}{computedTotal.toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
              ({defaultPersons} Person · {totalDays} Days · {dailyPerPerson}{currency}/day)
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!includesBreakfast && !includesLunch}
            className={`ios-btn ${!includesBreakfast && !includesLunch ? '' : 'ios-btn-primary'}`} 
            style={{ 
              width: '100%',
              padding: '13px',
              fontSize: '14px',
              fontWeight: 700,
              gap: '8px',
              justifyContent: 'center',
              cursor: !includesBreakfast && !includesLunch ? 'not-allowed' : 'pointer',
              opacity: !includesBreakfast && !includesLunch ? 0.45 : 1,
              background: !includesBreakfast && !includesLunch ? 'var(--glass-border)' : undefined,
              color: !includesBreakfast && !includesLunch ? 'var(--text-muted)' : undefined,
              boxShadow: !includesBreakfast && !includesLunch ? 'none' : undefined,
              transition: 'all 0.2s ease',
            }}
          >
            {initialPackage ? <Check size={16} /> : <Sparkles size={16} />}
            <span>
              {!includesBreakfast && !includesLunch
                ? 'Select a Meal to Proceed'
                : initialPackage
                ? 'Save Plan Changes'
                : 'Start Subscription'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
