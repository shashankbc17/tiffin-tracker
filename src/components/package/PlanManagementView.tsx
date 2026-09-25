import React, { useState } from 'react';
import { PackagePlan, RateConfig, CarryOverStats, DayRecord } from '../../types';
import { addActiveDays, countActiveDaysBetween, getIstNow } from '../../services/carryOverEngine';
import {
  Plus,
  Check,
  Calendar,
  CalendarDays,
  Trash2,
  Edit3,
  Coffee,
  Utensils,
  Star,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { InfoPopover } from '../common/InfoPopover';

interface PlanManagementViewProps {
  packages: PackagePlan[];
  activePackageId: string | null;
  config: RateConfig;
  records: Record<string, DayRecord>;
  stats: CarryOverStats;
  onSelectPackage: (packageId: string) => void;
  onSavePackage: (pkg: PackagePlan) => void;
  onEditPackage: (pkg: PackagePlan) => void;
  onDeletePackage: (packageId: string) => void;
  onOpenCreateModal?: () => void;
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

export const PlanManagementView: React.FC<PlanManagementViewProps> = ({
  packages,
  activePackageId,
  config,
  records,
  stats,
  onSelectPackage,
  onSavePackage,
  onEditPackage,
  onDeletePackage,
}) => {
  const currency = config.currency || '₹';
  const { dateStr: todayStr } = getIstNow();

  // State to control inline "Add New Plan" builder expansion
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(packages.length === 0);

  // Form states for adding a new plan
  const [title, setTitle] = useState('Meal Subscription');
  const [startDate, setStartDate] = useState(todayStr);
  const [totalDaysStr, setTotalDaysStr] = useState('20');
  const [activeDaysOfWeek, setActiveDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [endDate, setEndDate] = useState<string>(() => {
    return addActiveDays(todayStr, 20, [1, 2, 3, 4, 5, 6]);
  });
  const [breakfastRateStr, setBreakfastRateStr] = useState(
    String(config.defaultBreakfastRate || 60)
  );
  const [lunchRateStr, setLunchRateStr] = useState(
    String(config.defaultLunchRate || 90)
  );
  const [defaultPersonsStr, setDefaultPersonsStr] = useState(
    String(config.defaultPersons || 1)
  );
  const [includesBreakfast, setIncludesBreakfast] = useState(true);
  const [includesLunch, setIncludesLunch] = useState(true);
  const [notes, setNotes] = useState('');
  const [createdSuccess, setCreatedSuccess] = useState(false);

  // Derived values
  const totalDays = Math.max(1, parseInt(totalDaysStr, 10) || 1);
  const breakfastRate = Math.max(0, parseInt(breakfastRateStr, 10) || 0);
  const lunchRate = Math.max(0, parseInt(lunchRateStr, 10) || 0);
  const defaultPersons = Math.max(1, parseInt(defaultPersonsStr, 10) || 1);

  const dailyRate =
    (includesBreakfast ? breakfastRate : 0) + (includesLunch ? lunchRate : 0);
  const totalEstimatedCost = dailyRate * defaultPersons * totalDays;

  // Reactive bidirectional handlers
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (!newStart) return;
    if (endDate && endDate >= newStart) {
      const activeCount = countActiveDaysBetween(newStart, endDate, activeDaysOfWeek);
      setTotalDaysStr(String(Math.max(1, activeCount)));
    } else {
      const newEnd = addActiveDays(newStart, totalDays, activeDaysOfWeek);
      setEndDate(newEnd);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (!newEnd || !startDate) return;
    if (newEnd >= startDate) {
      const activeCount = countActiveDaysBetween(startDate, newEnd, activeDaysOfWeek);
      setTotalDaysStr(String(Math.max(1, activeCount)));
    }
  };

  const handleTotalDaysChange = (newDaysStr: string) => {
    setTotalDaysStr(newDaysStr);
    const parsed = parseInt(newDaysStr, 10);
    if (!isNaN(parsed) && parsed > 0 && startDate) {
      const newEnd = addActiveDays(startDate, parsed, activeDaysOfWeek);
      setEndDate(newEnd);
    }
  };

  const handleScheduleChange = (newList: number[]) => {
    if (newList.length === 0) {
      alert('You must have at least one active delivery day!');
      return;
    }
    setActiveDaysOfWeek(newList);
    if (startDate && endDate && endDate >= startDate) {
      const activeCount = countActiveDaysBetween(startDate, endDate, newList);
      setTotalDaysStr(String(Math.max(1, activeCount)));
    } else if (startDate && totalDays > 0) {
      const newEnd = addActiveDays(startDate, totalDays, newList);
      setEndDate(newEnd);
    }
  };

  const handleToggleDay = (day: number) => {
    if (activeDaysOfWeek.includes(day)) {
      if (activeDaysOfWeek.length === 1) {
        alert('You must have at least one active delivery day!');
        return;
      }
      const updated = activeDaysOfWeek.filter((d) => d !== day);
      handleScheduleChange(updated);
    } else {
      const updated = [...activeDaysOfWeek, day].sort();
      handleScheduleChange(updated);
    }
  };

  const handleSetSchedulePreset = (type: 'mon-sat' | 'mon-fri' | 'all') => {
    const list =
      type === 'mon-sat'
        ? [1, 2, 3, 4, 5, 6]
        : type === 'mon-fri'
        ? [1, 2, 3, 4, 5]
        : [0, 1, 2, 3, 4, 5, 6];
    handleScheduleChange(list);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!includesBreakfast && !includesLunch) {
      alert('Please select at least Breakfast or Lunch for the plan.');
      return;
    }

    const newPkg: PackagePlan = {
      id: `pkg_${Date.now()}`,
      title: title.trim() || 'Meal Subscription',
      startDate,
      totalDays,
      activeDaysOfWeek,
      includesBreakfast,
      includesLunch,
      breakfastRate,
      lunchRate,
      defaultPersons,
      totalAmountPaid: totalEstimatedCost,
      status: 'active',
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSavePackage(newPkg);
    setCreatedSuccess(true);
    setTimeout(() => {
      setCreatedSuccess(false);
      setIsAddFormOpen(false);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header & Quick Add Trigger */}
      <div
        className="ios-card"
        style={{
          padding: '16px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Meal Subscription Plans
            </h2>
            <InfoPopover
              title="Subscription Plan Management"
              color="var(--accent-primary)"
              content="Create new meal packages, configure delivery days, and switch between subscriptions. The active plan powers your calendar and carry-over extensions."
            />
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: '3px 0 0 0',
            }}
          >
            {packages.length === 0
              ? 'No active meal plan. Add your first plan below to start tracking.'
              : `${packages.length} ${packages.length === 1 ? 'plan' : 'plans'} configured · Tap "+ Add New Plan" to start another subscription.`}
          </p>
        </div>

        {/* Big Add Plan Button */}
        <button
          type="button"
          onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          className="ios-btn ios-btn-primary"
          style={{
            padding: '9px 16px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          {isAddFormOpen ? <ChevronUp size={16} /> : <Plus size={16} />}
          <span>{isAddFormOpen ? 'Close Form' : '+ Add New Plan'}</span>
        </button>
      </div>

      {/* 2. Inline Add / Create New Plan Form (When opened or when 0 plans exist) */}
      {isAddFormOpen && (
        <form
          onSubmit={handleCreatePlan}
          className="ios-card"
          style={{
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--glass-border)',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <h3
                style={{
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Create New Meal Subscription
              </h3>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-lunch)',
                background: 'var(--accent-lunch-subtle)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Step-by-Step
            </span>
          </div>

          {/* Plan Title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '5px',
              }}
            >
              Plan Name / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. October Tiffin, Lunch Plan"
              className="ios-input"
              style={{ width: '100%', fontSize: '13.5px' }}
              required
            />
          </div>

          {/* Date Range & Package Duration Card */}
          <div
            style={{
              background: 'var(--metric-card-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  <Calendar size={13} color="var(--accent-primary)" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="ios-input"
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  <Calendar size={13} color="var(--accent-carryover)" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="ios-input"
                  style={{ width: '100%', fontSize: '13px' }}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: '5px',
                  }}
                >
                  <CalendarDays size={13} color="var(--accent-lunch)" />
                  <span>Package Days</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={totalDaysStr}
                  onChange={(e) => handleTotalDaysChange(e.target.value)}
                  className="ios-input"
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
                flexWrap: 'wrap',
                gap: '6px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                borderTop: '1px dashed var(--glass-border)',
                paddingTop: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>✓ Auto-Synced:</span>
                <span>
                  <strong>{totalDays}</strong> active delivery day{totalDays > 1 ? 's' : ''} ({startDate} → {endDate})
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {activeDaysOfWeek.length} delivery days/week
              </span>
            </div>
          </div>

          {/* Delivery Schedule Days (Directly Below Dates & Duration) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Delivery Schedule Days
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleSetSchedulePreset('mon-sat')}
                  className="ios-btn ios-btn-secondary"
                  style={{ 
                    padding: '3px 8px', 
                    fontSize: '10.5px',
                    borderColor: activeDaysOfWeek.length === 6 && !activeDaysOfWeek.includes(0) ? 'var(--accent-primary)' : undefined,
                    color: activeDaysOfWeek.length === 6 && !activeDaysOfWeek.includes(0) ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Mon-Sat
                </button>
                <button
                  type="button"
                  onClick={() => handleSetSchedulePreset('mon-fri')}
                  className="ios-btn ios-btn-secondary"
                  style={{ 
                    padding: '3px 8px', 
                    fontSize: '10.5px',
                    borderColor: activeDaysOfWeek.length === 5 && !activeDaysOfWeek.includes(0) && !activeDaysOfWeek.includes(6) ? 'var(--accent-primary)' : undefined,
                    color: activeDaysOfWeek.length === 5 && !activeDaysOfWeek.includes(0) && !activeDaysOfWeek.includes(6) ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Mon-Fri
                </button>
                <button
                  type="button"
                  onClick={() => handleSetSchedulePreset('all')}
                  className="ios-btn ios-btn-secondary"
                  style={{ 
                    padding: '3px 8px', 
                    fontSize: '10.5px',
                    borderColor: activeDaysOfWeek.length === 7 ? 'var(--accent-primary)' : undefined,
                    color: activeDaysOfWeek.length === 7 ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  All 7 Days
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {DAYS_META.map((item) => {
                const isActive = activeDaysOfWeek.includes(item.day);
                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => handleToggleDay(item.day)}
                    style={{
                      padding: '8px 2px',
                      borderRadius: 'var(--radius-sm)',
                      border: isActive
                        ? '1.5px solid var(--accent-primary)'
                        : '1px solid var(--glass-border)',
                      background: isActive ? 'var(--accent-primary-subtle)' : 'var(--metric-card-bg)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              💡 Selecting delivery days auto-calculates the exact number of package days between your start date &amp; end date.
            </div>
          </div>

          {/* Meal Types to Include */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Included Meals
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label
                className="metric-stat-box"
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  borderColor: includesBreakfast ? 'var(--accent-breakfast)' : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={includesBreakfast}
                  onChange={(e) => setIncludesBreakfast(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-breakfast)' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🍳 Breakfast
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {currency}{breakfastRate}/plate
                  </div>
                </div>
              </label>

              <label
                className="metric-stat-box"
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  borderColor: includesLunch ? 'var(--accent-lunch)' : undefined,
                }}
              >
                <input
                  type="checkbox"
                  checked={includesLunch}
                  onChange={(e) => setIncludesLunch(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-lunch)' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🍱 Lunch
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {currency}{lunchRate}/plate
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Rates and Persons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {includesBreakfast && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Breakfast Rate ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={breakfastRateStr}
                  onChange={(e) => setBreakfastRateStr(e.target.value)}
                  className="ios-input"
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>
            )}

            {includesLunch && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Lunch Rate ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={lunchRateStr}
                  onChange={(e) => setLunchRateStr(e.target.value)}
                  className="ios-input"
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Default Persons
              </label>
              <input
                type="number"
                min="1"
                value={defaultPersonsStr}
                onChange={(e) => setDefaultPersonsStr(e.target.value)}
                className="ios-input"
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Summary Banner & Submit */}
          <div
            className="plan-funds-banner"
            style={{
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--funds-text-secondary)' }}>
                Total Plan Value
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--funds-text-primary)' }}>
                {currency}{totalEstimatedCost.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--funds-text-secondary)' }}>
              {totalDays} delivery days · {defaultPersons} person(s)
            </div>
          </div>

          <button
            type="submit"
            className="ios-btn ios-btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '14px',
              fontWeight: 700,
              gap: '8px',
            }}
          >
            {createdSuccess ? <Check size={18} /> : <Plus size={18} />}
            <span>{createdSuccess ? 'Plan Created & Activated!' : 'Save & Activate Plan'}</span>
          </button>
        </form>
      )}

      {/* 3. List of All Subscription Plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 4px',
          }}
        >
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Saved Plans ({packages.length})
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Tap any card to switch or edit
          </span>
        </div>

        {packages.length === 0 ? (
          <div
            className="ios-card"
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '32px' }}>🍱</div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              No Meal Plans Created Yet
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, maxWidth: '280px' }}>
              Fill in the form above to start your breakfast or lunch subscription.
            </p>
          </div>
        ) : (
          packages.map((pkg) => {
            const isActive = pkg.id === activePackageId;
            const pkgDaysOfWeek = pkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6];
            const scheduleText =
              pkgDaysOfWeek.length === 7
                ? 'Daily (7 Days)'
                : pkgDaysOfWeek.length === 6 && !pkgDaysOfWeek.includes(0)
                ? 'Mon-Sat'
                : pkgDaysOfWeek.length === 5 && !pkgDaysOfWeek.includes(0) && !pkgDaysOfWeek.includes(6)
                ? 'Mon-Fri'
                : `${pkgDaysOfWeek.length} days/week`;

            return (
              <div
                key={pkg.id}
                className="ios-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: isActive ? '1.5px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                  background: isActive ? 'var(--bg-card)' : 'var(--bg-card)',
                  boxShadow: isActive ? '0 4px 16px rgba(16, 185, 129, 0.12)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Plan Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                        }}
                      >
                        {pkg.title}
                      </h4>
                      {isActive && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--funds-badge-bg)',
                            color: 'var(--funds-badge-text)',
                            border: '1px solid var(--funds-badge-border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Star size={11} fill="currentColor" /> Active Subscription
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Started {pkg.startDate} · {pkg.totalDays} Days · {scheduleText}
                    </div>
                  </div>

                  {/* Quick Select Button for Inactive Plans */}
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => onSelectPackage(pkg.id)}
                      className="ios-btn ios-btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-full)',
                        borderColor: 'rgba(16, 185, 129, 0.4)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      Set as Active
                    </button>
                  )}
                </div>

                {/* Plan Details Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                  }}
                >
                  <div className="metric-stat-box" style={{ padding: '8px 10px' }}>
                    <div className="metric-stat-label">Meals</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {pkg.includesBreakfast && pkg.includesLunch
                        ? 'Breakfast & Lunch'
                        : pkg.includesBreakfast
                        ? 'Breakfast Only'
                        : 'Lunch Only'}
                    </div>
                  </div>

                  <div className="metric-stat-box" style={{ padding: '8px 10px' }}>
                    <div className="metric-stat-label">Daily / Person</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {currency}
                      {(pkg.includesBreakfast ? pkg.breakfastRate : 0) +
                        (pkg.includesLunch ? pkg.lunchRate : 0)}
                    </div>
                  </div>

                  <div className="metric-stat-box" style={{ padding: '8px 10px' }}>
                    <div className="metric-stat-label">Plan Value</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '2px' }}>
                      {currency}
                      {pkg.totalAmountPaid ? pkg.totalAmountPaid.toLocaleString() : '—'}
                    </div>
                  </div>
                </div>

                {/* Card Actions: Edit & Delete */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--glass-border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onEditPackage(pkg)}
                    className="ios-btn ios-btn-secondary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '11.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete "${pkg.title}"?`)) {
                        onDeletePackage(pkg.id);
                      }
                    }}
                    className="ios-btn ios-btn-secondary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '11.5px',
                      color: 'var(--accent-skip)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
