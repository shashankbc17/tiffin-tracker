import React from 'react';
import { DayRecord, PackagePlan, RateConfig, MealStatus } from '../../types';
import { formatDate } from '../../services/carryOverEngine';
import { Check, FastForward, Clock, Edit2, Sparkles, Calendar, Coffee, Utensils } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodayActionBarProps {
  todayRecord?: DayRecord;
  activePackage: PackagePlan | null;
  config: RateConfig;
  onConfirmToday: (status: 'delivered' | 'skipped', meal?: 'both' | 'breakfast' | 'lunch') => void;
  onOpenDayDetails: (dateStr: string) => void;
}

export const TodayActionBar: React.FC<TodayActionBarProps> = ({
  todayRecord,
  activePackage,
  config,
  onConfirmToday,
  onOpenDayDetails,
}) => {
  const todayDate = new Date();
  const todayStr = formatDate(todayDate);
  const formattedToday = todayDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const todayDayOfWeek = todayDate.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[todayDayOfWeek];

  // 1. Is there an active package?
  const hasPackage = Boolean(activePackage);

  // 2. Future plan check (Starts in the future, e.g. starts Sep 21 while today is Sep 20)
  const isFuturePlan = Boolean(activePackage && todayStr < activePackage.startDate);
  
  let daysUntilStart = 0;
  let formattedStartDate = '';
  if (isFuturePlan && activePackage) {
    const d1 = new Date(todayStr + 'T00:00:00');
    const d2 = new Date(activePackage.startDate + 'T00:00:00');
    daysUntilStart = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    formattedStartDate = d2.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // 3. Scheduled off-day check (e.g. Sunday unopted)
  const isScheduledOff = Boolean(
    activePackage?.activeDaysOfWeek &&
    !activePackage.activeDaysOfWeek.includes(todayDayOfWeek)
  );

  // 4. Meal services included in package
  const incBreakfast = activePackage ? activePackage.includesBreakfast !== false : true;
  const incLunch = activePackage ? activePackage.includesLunch !== false : true;

  // 5. Existing record logs for today
  const bStatus = todayRecord?.breakfast?.status;
  const lStatus = todayRecord?.lunch?.status;
  const isCookOff = todayRecord?.isCookOff;

  const isLogged = (bStatus && bStatus !== 'none') || (lStatus && lStatus !== 'none') || isCookOff;

  // Demon Slayer image path (works in both dev and GitHub Pages base path)
  const demonSlayerImg = './assets/demon_slayer_umai.jpg';

  const handleQuickConfirm = (status: 'delivered' | 'skipped', meal?: 'both' | 'breakfast' | 'lunch') => {
    if (status === 'delivered') {
      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#10b981', '#34d399', '#f59e0b', '#fbbf24'],
      });
    }
    onConfirmToday(status, meal);
  };

  // Determine which UI State we are in
  // Priority: Logged > Future Plan > Scheduled Off > Active Delivery
  let stateKind: 'LOGGED' | 'FUTURE' | 'OFF_DAY' | 'ACTIVE_DELIVERY' | 'NO_PLAN' = 'NO_PLAN';

  if (!hasPackage) {
    stateKind = 'NO_PLAN';
  } else if (isLogged) {
    stateKind = 'LOGGED';
  } else if (isFuturePlan) {
    stateKind = 'FUTURE';
  } else if (isScheduledOff) {
    stateKind = 'OFF_DAY';
  } else {
    stateKind = 'ACTIVE_DELIVERY';
  }

  return (
    <div
      className="ios-card"
      style={{
        padding: '16px 18px',
        position: 'relative',
        overflow: 'hidden',
        background:
          stateKind === 'LOGGED'
            ? 'var(--bg-card)'
            : stateKind === 'ACTIVE_DELIVERY'
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.88) 100%)'
            : stateKind === 'FUTURE'
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.14) 0%, rgba(15, 23, 42, 0.88) 100%)'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(15, 23, 42, 0.88) 100%)',
        border:
          stateKind === 'ACTIVE_DELIVERY'
            ? '1px solid rgba(16, 185, 129, 0.35)'
            : stateKind === 'FUTURE'
            ? '1px solid rgba(59, 130, 246, 0.3)'
            : '1px solid var(--glass-border)',
      }}
    >
      {/* Demon Slayer background watermark glow */}
      <div
        style={{
          position: 'absolute',
          right: '-10px',
          bottom: '-15px',
          width: '90px',
          height: '90px',
          opacity: 0.12,
          pointerEvents: 'none',
          backgroundImage: `url(${demonSlayerImg})`,
          backgroundSize: 'cover',
          borderRadius: '50%',
          filter: 'blur(2px)',
        }}
      />

      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.2px' }}>
            Today: {formattedToday}
          </span>
        </div>

        {/* Dynamic status pill badge */}
        {stateKind === 'FUTURE' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#60a5fa',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ⏳ {daysUntilStart === 1 ? 'Starts Tomorrow' : `Starts ${formattedStartDate}`}
          </span>
        )}

        {stateKind === 'OFF_DAY' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#c4b5fd',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🏖️ Scheduled Off-Day
          </span>
        )}

        {stateKind === 'ACTIVE_DELIVERY' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🍱 Delivery Day
          </span>
        )}

        {stateKind === 'LOGGED' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.18)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✅ Confirmed
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        {/* Demon Slayer Anime Avatar Badge */}
        <div
          style={{
            position: 'relative',
            width: '58px',
            height: '58px',
            borderRadius: '16px',
            overflow: 'hidden',
            flexShrink: 0,
            border:
              stateKind === 'ACTIVE_DELIVERY'
                ? '2px solid #10b981'
                : stateKind === 'FUTURE'
                ? '2px solid #3b82f6'
                : '2px solid #8b5cf6',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            background: '#090d16',
          }}
        >
          <img
            src={demonSlayerImg}
            alt="Tanjiro & Nezuko Umai Bento"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.7)',
              fontSize: '8px',
              fontWeight: 800,
              color: '#f8fafc',
              textAlign: 'center',
              padding: '1px 0',
              letterSpacing: '0.5px',
            }}
          >
            {stateKind === 'FUTURE' ? 'REST' : stateKind === 'OFF_DAY' ? 'OFF' : 'UMAI!'}
          </div>
        </div>

        {/* Dynamic Contextual Text & Buttons */}
        <div style={{ flex: 1 }}>
          {/* CASE 1: Future Plan (Not Started Yet) */}
          {stateKind === 'FUTURE' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                {daysUntilStart === 1 ? 'Plan Starts Tomorrow! 🔥' : `Plan Starts on ${formattedStartDate}`}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                Tanjiro is preparing the kitchen. Your <span style={{ color: '#60a5fa', fontWeight: 600 }}>"{activePackage?.title}"</span> package begins tomorrow. No meals scheduled today!
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onOpenDayDetails(todayStr)}
                  className="ios-btn ios-btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span>Log early meal / extra</span>
                </button>
              </div>
            </div>
          )}

          {/* CASE 2: Scheduled Day Off (e.g. Sunday unopted) */}
          {stateKind === 'OFF_DAY' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                Today is your Day Off! 🌸
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                {todayDayName}s are not opted in your plan. Nezuko is resting today — no tiffin delivery expected!
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onOpenDayDetails(todayStr)}
                  className="ios-btn ios-btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    color: '#c4b5fd',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <span>Had an extra / guest meal?</span>
                </button>
              </div>
            </div>
          )}

          {/* CASE 3: Active Delivery Day (Needs Confirmation) */}
          {stateKind === 'ACTIVE_DELIVERY' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                {incBreakfast && incLunch && 'Did your meals arrive today? 🍱'}
                {incBreakfast && !incLunch && 'Did your Breakfast arrive today? 🍳'}
                {!incBreakfast && incLunch && 'Did your Lunch arrive today? 🍱'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                {incBreakfast && incLunch && 'Breakfast & Lunch scheduled. Tap below to confirm or carry-over:'}
                {incBreakfast && !incLunch && 'Breakfast scheduled (Lunch is not included in this plan).'}
                {!incBreakfast && incLunch && 'Lunch scheduled (Breakfast is not included in this plan).'}
              </div>

              {/* Action Buttons tailored specifically to the plan services */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr', gap: '8px' }}>
                <button
                  onClick={() => handleQuickConfirm('delivered', incBreakfast && !incLunch ? 'breakfast' : !incBreakfast && incLunch ? 'lunch' : 'both')}
                  className="ios-btn ios-btn-primary"
                  style={{ padding: '9px 6px', fontSize: '11.5px', fontWeight: 600 }}
                >
                  <Check size={14} />
                  <span>
                    {incBreakfast && incLunch ? 'Both Served ✅' : incBreakfast ? 'Breakfast ✅' : 'Lunch ✅'}
                  </span>
                </button>

                <button
                  onClick={() => handleQuickConfirm('skipped', incBreakfast && !incLunch ? 'breakfast' : !incBreakfast && incLunch ? 'lunch' : 'both')}
                  className="ios-btn ios-btn-secondary"
                  style={{ padding: '9px 6px', fontSize: '11.5px', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.4)' }}
                >
                  <FastForward size={14} />
                  <span>Skip (Carry)</span>
                </button>

                <button
                  onClick={() => onOpenDayDetails(todayStr)}
                  className="ios-btn ios-btn-secondary"
                  style={{ padding: '9px 6px', fontSize: '11px' }}
                >
                  <span>More...</span>
                </button>
              </div>
            </div>
          )}

          {/* CASE 4: Already Logged / Confirmed View */}
          {stateKind === 'LOGGED' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Meals Confirmed! Umai! 🔥
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {isCookOff
                      ? '👨‍🍳 Cook Off (Saved to carry-over extension)'
                      : [
                          incBreakfast || (bStatus && bStatus !== 'none') ? `🍳 Breakfast: ${bStatus || 'none'}` : null,
                          incLunch || (lStatus && lStatus !== 'none') ? `🍱 Lunch: ${lStatus || 'none'}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                  </div>
                </div>

                <button
                  onClick={() => onOpenDayDetails(todayStr)}
                  className="ios-btn ios-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px', flexShrink: 0 }}
                >
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )}

          {/* CASE 5: No Active Plan */}
          {stateKind === 'NO_PLAN' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
                Welcome to TiffinFlow! 🍱
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '8px' }}>
                Create or activate a meal subscription above to start tracking deliveries and smart carry-overs.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

