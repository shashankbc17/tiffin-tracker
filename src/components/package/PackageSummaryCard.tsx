import React, { useState } from 'react';
import { PackagePlan, CarryOverStats, RateConfig } from '../../types';
import { formatDate } from '../../services/carryOverEngine';
import { CalendarClock, Sparkles, FastForward, ShieldCheck, Trash2, AlertTriangle, X, Edit3, Clock } from 'lucide-react';

interface PackageSummaryCardProps {
  pkg: PackagePlan | null;
  stats: CarryOverStats;
  config: RateConfig;
  onOpenNewPackage: () => void;
  onEditPackage?: () => void;
  onDeletePackage?: (deleteLogs: boolean) => void;
}

export const PackageSummaryCard: React.FC<PackageSummaryCardProps> = ({
  pkg,
  stats,
  config,
  onOpenNewPackage,
  onEditPackage,
  onDeletePackage,
}) => {
  const currency = config.currency || '₹';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const todayStr = formatDate(new Date());
  const isUpcoming = Boolean(pkg && todayStr < pkg.startDate);
  let daysUntilStart = 0;
  let formattedStartDate = '';
  if (isUpcoming && pkg) {
    const d1 = new Date(todayStr + 'T00:00:00');
    const d2 = new Date(pkg.startDate + 'T00:00:00');
    daysUntilStart = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    formattedStartDate = d2.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  if (!pkg) {
    return (
      <div className="ios-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No Active Package</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>
          Subscribe to a meal plan to automatically track meals, rates, and skipped carry-overs.
        </p>
        <button onClick={onOpenNewPackage} className="ios-btn ios-btn-primary">
          <Sparkles size={16} />
          <span>Start New Meal Package</span>
        </button>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.round((stats.effectiveDaysConsumed / pkg.totalDays) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Carry-over Highlight Banner */}
      {stats.carryOverDays > 0 && (
        <div className="carryover-banner">
          <div 
            style={{ 
              background: 'var(--accent-carryover)', 
              borderRadius: '50%', 
              padding: '10px', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FastForward size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#c4b5fd' }}>
              {stats.carryOverDays} Days Carried Over!
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Skips automatically pushed your validity to <strong style={{ color: '#fff' }}>{stats.extendedEndDate}</strong> (originally {stats.originalEndDate}).
            </div>
          </div>
        </div>
      )}

      {/* Main Package Glass Card */}
      <div className="ios-card">
        {/* Coming Soon Countdown Banner if plan has not started yet */}
        {isUpcoming && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginBottom: '16px', 
              padding: '10px 14px', 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid rgba(59, 130, 246, 0.3)' 
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, border: '2px solid #60a5fa', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
              <img src="./assets/anime_coming_soon.jpg" alt="Coming Soon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd' }}>
                Countdown to First Delivery! ⏳
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Zenitsu & Tanjiro are counting down. Your meal plan will activate on <strong style={{ color: '#f8fafc' }}>{formattedStartDate}</strong>!
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            {isUpcoming ? (
              <span 
                style={{ 
                  marginBottom: '6px', 
                  background: 'rgba(59, 130, 246, 0.18)', 
                  color: '#60a5fa', 
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Clock size={12} /> {daysUntilStart === 1 ? 'Activates Tomorrow' : `Activates on ${formattedStartDate}`}
              </span>
            ) : (
              <span className="badge badge-carryover" style={{ marginBottom: '6px' }}>
                <ShieldCheck size={12} /> Active Plan
              </span>
            )}
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>{pkg.title}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isUpcoming 
                ? `Starts ${pkg.startDate} (${pkg.totalDays} Days · in ${daysUntilStart === 1 ? '1 day' : `${daysUntilStart} days`})`
                : `Started ${pkg.startDate} (${pkg.totalDays} Days)`}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onEditPackage && (
              <button 
                onClick={onEditPackage}
                title="Edit active plan"
                style={{ 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  border: '1px solid rgba(59, 130, 246, 0.35)', 
                  color: '#93c5fd',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Edit3 size={11} />
                <span>Edit</span>
              </button>
            )}

            <button 
              onClick={onOpenNewPackage}
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)', 
                border: 'none', 
                color: 'var(--text-secondary)',
                fontSize: '11px',
                padding: '5px 10px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer'
              }}
            >
              + New Plan
            </button>

            {onDeletePackage && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete or cancel this plan"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  color: '#f87171',
                  borderRadius: 'var(--radius-full)',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Package Progress</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              {stats.effectiveDaysConsumed} / {pkg.totalDays} Days ({progressPercent}%)
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${progressPercent}%`, 
                background: 'linear-gradient(90deg, #10b981, #34d399)', 
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>
        </div>

        {/* 4-Grid Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Remaining Days</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {stats.remainingDays}
            </div>
            <div style={{ fontSize: '10px', color: '#10b981' }}>Valid till {stats.extendedEndDate}</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carry-over Days</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#a78bfa', marginTop: '2px' }}>
              +{stats.carryOverDays}
            </div>
            <div style={{ fontSize: '10px', color: '#a78bfa' }}>Worth {currency}{stats.carriedOverValue}</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Breakfasts Served</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
              {stats.breakfastDelivered} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({stats.breakfastSkipped} skipped)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lunches Served</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              {stats.lunchDelivered} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({stats.lunchSkipped} skipped)</span>
            </div>
          </div>
        </div>

        {/* Date Extension Details */}
        <div 
          style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(15, 23, 42, 0.5)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarClock size={16} color="var(--accent-carryover)" />
            <span style={{ color: 'var(--text-secondary)' }}>Original Expiry:</span>
          </div>
          <div>
            <span style={{ textDecoration: stats.carryOverDays > 0 ? 'line-through' : 'none', color: 'var(--text-muted)' }}>
              {stats.originalEndDate}
            </span>
            {stats.carryOverDays > 0 && (
              <span style={{ marginLeft: '8px', color: '#a78bfa', fontWeight: 700 }}>
                → {stats.extendedEndDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delete / Reset Plan Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '8px', borderRadius: '50%' }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Delete Current Plan?</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {pkg.title} ({pkg.totalDays} Days)
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
              Made a mistake when setting up this package? You can delete it and start a new one right away.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  onDeletePackage?.(false);
                  setShowDeleteConfirm(false);
                }}
                className="ios-btn"
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', width: '100%' }}
              >
                <Trash2 size={16} />
                <span>Delete Plan (Keep Meal History)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeletePackage?.(true);
                  setShowDeleteConfirm(false);
                }}
                className="ios-btn"
                style={{ background: 'rgba(239, 68, 68, 0.35)', border: '1px solid #ef4444', color: '#ffffff', width: '100%' }}
              >
                <Trash2 size={16} />
                <span>Delete Plan & Clear All Logs (Fresh Start)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="ios-btn ios-btn-secondary"
                style={{ width: '100%', marginTop: '4px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
