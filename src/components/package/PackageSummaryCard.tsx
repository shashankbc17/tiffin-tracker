import React from 'react';
import { PackagePlan, CarryOverStats, RateConfig } from '../../types';
import { CalendarClock, Sparkles, FastForward, CheckCircle, ShieldCheck } from 'lucide-react';

interface PackageSummaryCardProps {
  pkg: PackagePlan | null;
  stats: CarryOverStats;
  config: RateConfig;
  onOpenNewPackage: () => void;
}

export const PackageSummaryCard: React.FC<PackageSummaryCardProps> = ({
  pkg,
  stats,
  config,
  onOpenNewPackage,
}) => {
  const currency = config.currency || '₹';

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <span className="badge badge-carryover" style={{ marginBottom: '6px' }}>
              <ShieldCheck size={12} /> Active Plan
            </span>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>{pkg.title}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Started {pkg.startDate} ({pkg.totalDays} Days)
            </div>
          </div>

          <button 
            onClick={onOpenNewPackage}
            style={{ 
              background: 'rgba(255, 255, 255, 0.08)', 
              border: 'none', 
              color: 'var(--text-secondary)',
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer'
            }}
          >
            + New Plan
          </button>
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
    </div>
  );
};
