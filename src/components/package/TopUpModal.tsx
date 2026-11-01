import React, { useState, useEffect } from 'react';
import { PackagePlan, RateConfig, DayRecord } from '../../types';
import {
  getIstNow,
  addActiveDays,
  applyTopUpToPackage,
} from '../../services/carryOverEngine';
import {
  X,
  PlusCircle,
  Check,
  Sparkles,
  ArrowRight,
  Wallet,
  Coffee,
  Utensils,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPackage: PackagePlan | null;
  packages: PackagePlan[];
  config: RateConfig;
  records: Record<string, DayRecord>;
  onApplyTopUp: (
    updatedPkg: PackagePlan,
    topUpDate: string,
    topUpAmount: number,
    addedDays: number,
    notes?: string
  ) => void;
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

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  targetPackage,
  packages,
  config,
  records,
  onApplyTopUp,
}) => {
  if (!isOpen || !targetPackage) return null;

  const currency = config.currency || '₹';
  const { dateStr: todayStr } = getIstNow();

  // Selected package tracking (allows switching between plans)
  const [selectedPkgId, setSelectedPkgId] = useState<string>(targetPackage.id);
  const currentPkg = packages.find((p) => p.id === selectedPkgId) || targetPackage;

  // Form states
  const [topUpDate, setTopUpDate] = useState<string>(todayStr);
  const [amountStr, setAmountStr] = useState<string>('2280');
  const [daysStr, setDaysStr] = useState<string>('19');
  const [mode, setMode] = useState<'same' | 'custom'>('same');

  // Custom schedule overrides if user selects "Change / Select Days"
  const [includesBreakfast, setIncludesBreakfast] = useState<boolean>(currentPkg.includesBreakfast);
  const [includesLunch, setIncludesLunch] = useState<boolean>(currentPkg.includesLunch);
  const [bDaysOfWeek, setBDaysOfWeek] = useState<number[]>(
    currentPkg.breakfastDaysOfWeek || currentPkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]
  );
  const [lDaysOfWeek, setLDaysOfWeek] = useState<number[]>(
    currentPkg.lunchDaysOfWeek || currentPkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]
  );
  const [breakfastRateStr, setBreakfastRateStr] = useState<string>(
    String(currentPkg.breakfastRate || config.defaultBreakfastRate || 50)
  );
  const [lunchRateStr, setLunchRateStr] = useState<string>(
    String(currentPkg.lunchRate || config.defaultLunchRate || 120)
  );
  const [personsStr, setPersonsStr] = useState<string>(
    String(currentPkg.defaultPersons || 1)
  );
  const [notes, setNotes] = useState<string>('Advance top-up sent via GPay');
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize internal state whenever targetPackage or selectedPkgId changes
  useEffect(() => {
    if (targetPackage) {
      setSelectedPkgId(targetPackage.id);
      syncPackageDefaults(targetPackage);
    }
  }, [targetPackage?.id, isOpen]);

  const syncPackageDefaults = (pkg: PackagePlan) => {
    setIncludesBreakfast(pkg.includesBreakfast);
    setIncludesLunch(pkg.includesLunch);
    setBDaysOfWeek(pkg.breakfastDaysOfWeek || pkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]);
    setLDaysOfWeek(pkg.lunchDaysOfWeek || pkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]);
    setBreakfastRateStr(String(pkg.breakfastRate || config.defaultBreakfastRate || 50));
    setLunchRateStr(String(pkg.lunchRate || config.defaultLunchRate || 120));
    setPersonsStr(String(pkg.defaultPersons || 1));
    setMode('same');
    setValidationError(null);

    // Compute sensible default amount for this package
    const dailyCost =
      ((pkg.includesBreakfast ? pkg.breakfastRate : 0) +
        (pkg.includesLunch ? pkg.lunchRate : 0)) *
      (pkg.defaultPersons || 1);

    if (dailyCost > 0) {
      // If lunch package, suggest 19 days (2280) or 20 days (2400) or 10 days (1200)
      const suggestedDays = pkg.includesLunch && !pkg.includesBreakfast ? 19 : 10;
      const initialAmt = suggestedDays * dailyCost;
      setAmountStr(String(initialAmt));
      setDaysStr(String(suggestedDays));
    }
  };

  const handleSelectPlan = (pkgId: string) => {
    setSelectedPkgId(pkgId);
    const found = packages.find((p) => p.id === pkgId);
    if (found) {
      syncPackageDefaults(found);
    }
  };

  // Derived numeric values
  const amount = parseFloat(amountStr) || 0;
  const breakfastRate = Math.max(0, parseFloat(breakfastRateStr) || 0);
  const lunchRate = Math.max(0, parseFloat(lunchRateStr) || 0);
  const persons = Math.max(1, parseInt(personsStr, 10) || 1);

  // Compute daily cost based on mode
  const effectiveDailyCost =
    mode === 'same'
      ? ((currentPkg.includesBreakfast ? currentPkg.breakfastRate : 0) +
          (currentPkg.includesLunch ? currentPkg.lunchRate : 0)) *
        (currentPkg.defaultPersons || 1)
      : ((includesBreakfast ? breakfastRate : 0) + (includesLunch ? lunchRate : 0)) * persons;

  // Bidirectional sync: user changes Amount -> recalculate Days
  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    setValidationError(null);
    const parsedAmt = parseFloat(val);
    if (!isNaN(parsedAmt) && parsedAmt > 0 && effectiveDailyCost > 0) {
      const calcDays = Math.round(parsedAmt / effectiveDailyCost);
      setDaysStr(String(Math.max(1, calcDays)));
    }
  };

  // Bidirectional sync: user changes Days -> recalculate Amount
  const handleDaysChange = (val: string) => {
    setDaysStr(val);
    setValidationError(null);
    const parsedDays = parseInt(val, 10);
    if (!isNaN(parsedDays) && parsedDays > 0 && effectiveDailyCost > 0) {
      const calcAmt = parsedDays * effectiveDailyCost;
      setAmountStr(String(calcAmt));
    }
  };

  const addedDays = Math.max(0, parseInt(daysStr, 10) || 0);

  // Days of week active for extension projection
  const effectiveActiveDays =
    mode === 'same'
      ? currentPkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6]
      : Array.from(
          new Set([
            ...(includesBreakfast ? bDaysOfWeek : []),
            ...(includesLunch ? lDaysOfWeek : []),
          ])
        ).sort();

  // Projected new dates
  const newTotalDays = currentPkg.totalDays + (addedDays > 0 ? addedDays : 0);
  const newTotalAmount = (currentPkg.totalAmountPaid || 0) + (amount > 0 ? amount : 0);
  const currentEndDate = addActiveDays(
    currentPkg.startDate,
    currentPkg.totalDays,
    effectiveActiveDays
  );
  const projectedEndDate = addActiveDays(
    currentPkg.startDate,
    newTotalDays,
    effectiveActiveDays
  );

  const toggleDay = (day: number, list: number[], setList: (arr: number[]) => void) => {
    if (list.includes(day)) {
      if (list.length === 1) return; // keep at least 1 day
      setList(list.filter((d) => d !== day));
    } else {
      setList([...list, day].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(amount) || amount <= 0) {
      setValidationError('Please enter a valid top-up amount greater than 0.');
      return;
    }

    if (isNaN(addedDays) || addedDays <= 0) {
      setValidationError('Please enter a valid number of days to add (at least 1 day).');
      return;
    }

    setValidationError(null);

    const { updatedPkg } = applyTopUpToPackage(currentPkg, {
      date: topUpDate,
      amount,
      addedDays,
      breakfastDaysOfWeek:
        mode === 'custom' && includesBreakfast ? bDaysOfWeek : currentPkg.breakfastDaysOfWeek,
      lunchDaysOfWeek:
        mode === 'custom' && includesLunch ? lDaysOfWeek : currentPkg.lunchDaysOfWeek,
      breakfastRate: mode === 'custom' ? breakfastRate : currentPkg.breakfastRate,
      lunchRate: mode === 'custom' ? lunchRate : currentPkg.lunchRate,
      defaultPersons: mode === 'custom' ? persons : currentPkg.defaultPersons,
      notes: notes.trim() || undefined,
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    onApplyTopUp(
      updatedPkg,
      topUpDate,
      amount,
      addedDays,
      syncToCalendar ? notes.trim() || `Topped up ${currency}${amount} (+${addedDays} days)` : undefined
    );
    onClose();
  };

  // Dynamic preset pills tailored to package daily cost
  const PRESET_PILLS = [
    { label: `${currency}1,000`, val: 1000 },
    { label: `${currency}1,200`, val: 1200 },
    { label: `${currency}2,280`, val: 2280 },
    { label: `${currency}2,400`, val: 2400 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="sheet-handle" />

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.18)',
                color: 'var(--accent-primary)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Top Up Existing Plan</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Add funds, extend subscription days &amp; log payment history
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Plan Switcher if multiple plans exist */}
        {packages.length > 1 && (
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                display: 'block',
              }}
            >
              Subscription Plan to Top Up:
            </label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
              }}
            >
              {packages.map((p) => {
                const isSel = p.id === currentPkg.id;
                const pDaily =
                  ((p.includesBreakfast ? p.breakfastRate : 0) +
                    (p.includesLunch ? p.lunchRate : 0)) *
                  (p.defaultPersons || 1);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPlan(p.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: isSel
                        ? '1.5px solid var(--accent-primary)'
                        : '1px solid var(--glass-border)',
                      background: isSel
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: isSel ? '#34d399' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{p.title}</span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {currency}{pDaily}/day
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
            <span>{validationError}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {/* Top-Up Amount & Quick Presets */}
          <div
            className="ios-card"
            style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Top-Up Amount ({currency})
              </label>
              <span
                style={{
                  fontSize: '11px',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                }}
              >
                Daily Cost: {currency}{effectiveDailyCost}/day
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="number"
                min="1"
                step="any"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="ios-input"
                placeholder="2280"
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                }}
                required
              />
            </div>

            {/* Quick Preset Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {PRESET_PILLS.map((pr) => (
                <button
                  key={pr.val}
                  type="button"
                  onClick={() => handleAmountChange(String(pr.val))}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 'var(--radius-full)',
                    background:
                      amount === pr.val
                        ? 'rgba(16, 185, 129, 0.25)'
                        : 'rgba(255, 255, 255, 0.06)',
                    border:
                      amount === pr.val
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--glass-border)',
                    color: amount === pr.val ? '#34d399' : 'var(--text-secondary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +{pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Date & Days Added */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Payment / Top-Up Date
              </label>
              <input
                type="date"
                value={topUpDate}
                onChange={(e) => setTopUpDate(e.target.value)}
                className="ios-input"
                style={{ fontSize: '13px' }}
                required
              />
            </div>

            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Days Added to Plan
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={daysStr}
                  onChange={(e) => handleDaysChange(e.target.value)}
                  className="ios-input"
                  placeholder="19"
                  style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}
                  required
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>days</span>
              </div>
            </div>
          </div>

          {/* Schedule Preference: Keep Same vs Customize */}
          <div
            className="ios-card"
            style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)' }}
          >
            <label
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Meal Days &amp; Schedule:
            </label>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setMode('same')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border:
                    mode === 'same'
                      ? '1.5px solid var(--accent-primary)'
                      : '1px solid var(--glass-border)',
                  background:
                    mode === 'same'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.04)',
                  color: mode === 'same' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} style={{ opacity: mode === 'same' ? 1 : 0 }} />
                <span>Keep Same Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border:
                    mode === 'custom'
                      ? '1.5px solid var(--accent-primary)'
                      : '1px solid var(--glass-border)',
                  background:
                    mode === 'custom'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.04)',
                  color: mode === 'custom' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <SlidersHorizontal size={14} />
                <span>Change / Select Days</span>
              </button>
            </div>

            {mode === 'same' ? (
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.5',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                ℹ️ Keeping existing settings for <strong>{currentPkg.title}</strong>:
                {currentPkg.includesBreakfast && (
                  <div>
                    • 🍳 Breakfast @ {currency}{currentPkg.breakfastRate}/plate (
                    {currentPkg.breakfastDaysOfWeek?.length || 6} days/wk)
                  </div>
                )}
                {currentPkg.includesLunch && (
                  <div>
                    • 🍱 Lunch @ {currency}{currentPkg.lunchRate}/plate (
                    {currentPkg.lunchDaysOfWeek?.length || 6} days/wk)
                  </div>
                )}
                <div>• Persons: {currentPkg.defaultPersons || 1} person</div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '6px',
                }}
              >
                {/* Breakfast Days Selector */}
                <div
                  style={{
                    background: 'rgba(217, 119, 6, 0.08)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--accent-breakfast)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Coffee size={14} /> Breakfast Schedule
                    </label>
                    <input
                      type="checkbox"
                      checked={includesBreakfast}
                      onChange={(e) => setIncludesBreakfast(e.target.checked)}
                      style={{
                        accentColor: 'var(--accent-breakfast)',
                        width: '16px',
                        height: '16px',
                      }}
                    />
                  </div>

                  {includesBreakfast && (
                    <>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        {DAYS_META.map((d) => {
                          const active = bDaysOfWeek.includes(d.day);
                          return (
                            <button
                              key={d.day}
                              type="button"
                              onClick={() => toggleDay(d.day, bDaysOfWeek, setBDaysOfWeek)}
                              style={{
                                flex: 1,
                                padding: '5px 0',
                                borderRadius: '4px',
                                border: active
                                  ? '1px solid var(--accent-breakfast)'
                                  : '1px solid var(--glass-border)',
                                background: active
                                  ? 'var(--accent-breakfast)'
                                  : 'rgba(255, 255, 255, 0.04)',
                                color: active ? '#fff' : 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Rate/plate:
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={breakfastRateStr}
                            onChange={(e) => setBreakfastRateStr(e.target.value)}
                            className="ios-input"
                            style={{ padding: '4px 8px', fontSize: '12px', marginTop: '2px' }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Lunch Days Selector */}
                <div
                  style={{
                    background: 'rgba(5, 150, 105, 0.08)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(5, 150, 105, 0.25)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--accent-lunch)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Utensils size={14} /> Lunch Schedule
                    </label>
                    <input
                      type="checkbox"
                      checked={includesLunch}
                      onChange={(e) => setIncludesLunch(e.target.checked)}
                      style={{
                        accentColor: 'var(--accent-lunch)',
                        width: '16px',
                        height: '16px',
                      }}
                    />
                  </div>

                  {includesLunch && (
                    <>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        {DAYS_META.map((d) => {
                          const active = lDaysOfWeek.includes(d.day);
                          return (
                            <button
                              key={d.day}
                              type="button"
                              onClick={() => toggleDay(d.day, lDaysOfWeek, setLDaysOfWeek)}
                              style={{
                                flex: 1,
                                padding: '5px 0',
                                borderRadius: '4px',
                                border: active
                                  ? '1px solid var(--accent-lunch)'
                                  : '1px solid var(--glass-border)',
                                background: active
                                  ? 'var(--accent-lunch)'
                                  : 'rgba(255, 255, 255, 0.04)',
                                color: active ? '#fff' : 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Rate/plate:
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={lunchRateStr}
                            onChange={(e) => setLunchRateStr(e.target.value)}
                            className="ios-input"
                            style={{ padding: '4px 8px', fontSize: '12px', marginTop: '2px' }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Extension & Impact Live Preview Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#34d399',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={15} /> Extension Preview for {currentPkg.title}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  Total Package Days:
                </span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentPkg.totalDays}d{' '}
                  <ArrowRight
                    size={11}
                    style={{ display: 'inline', margin: '0 2px' }}
                  />{' '}
                  <span style={{ color: '#34d399' }}>
                    {newTotalDays} Days (+{addedDays}d)
                  </span>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  Total Budget Paid:
                </span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currency}{(currentPkg.totalAmountPaid || 0).toLocaleString()}{' '}
                  <ArrowRight
                    size={11}
                    style={{ display: 'inline', margin: '0 2px' }}
                  />{' '}
                  <span style={{ color: '#34d399' }}>
                    {currency}{newTotalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div
                style={{
                  gridColumn: 'span 2',
                  marginTop: '4px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  Projected Expiry Date:
                </span>
                <div style={{ fontWeight: 700, color: 'var(--accent-carryover)' }}>
                  {currentEndDate}{' '}
                  <ArrowRight
                    size={11}
                    style={{ display: 'inline', margin: '0 2px' }}
                  />{' '}
                  <span>{projectedEndDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Notes & Reference */}
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Payment Note / Transaction Reference:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent ₹2,280 via GPay (Srinath 8296444895)"
              className="ios-input"
              style={{ fontSize: '12.5px' }}
            />
          </div>

          {/* Sync note to calendar day checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="syncToCalendar"
              checked={syncToCalendar}
              onChange={(e) => setSyncToCalendar(e.target.checked)}
              style={{
                accentColor: 'var(--accent-primary)',
                width: '16px',
                height: '16px',
              }}
            />
            <label
              htmlFor="syncToCalendar"
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Highlight top-up note on calendar date ({topUpDate})
            </label>
          </div>

          {/* Submit & Cancel Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              className="ios-btn ios-btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ios-btn ios-btn-primary"
              style={{
                flex: 2,
                background:
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              <PlusCircle size={16} />
              <span>
                Confirm Top-Up (+{currency}{amount.toLocaleString()})
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
