import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DayRecord, PackagePlan, RateConfig } from '../../types';
import {
  generateBankStatementData,
  generateFullBankStatementText,
  downloadStatementPdf,
  shareStatementToWhatsApp,
  exportStatementCsv,
  StatementSummaryData,
} from '../../services/statementPdfGenerator';
import { getLast6Months, getIstNow } from '../../services/carryOverEngine';
import {
  X,
  Share2,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Building2,
  FileText,
  Calendar,
  AlertCircle,
  ExternalLink,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { InfoPopover } from '../common/InfoPopover';

interface StatementExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: Record<string, DayRecord>;
  activePackage: PackagePlan | null;
  packages?: PackagePlan[];
  config: RateConfig;
  initialMonthKey?: string;
}

export const StatementExportModal: React.FC<StatementExportModalProps> = ({
  isOpen,
  onClose,
  records,
  activePackage,
  packages,
  config,
  initialMonthKey,
}) => {
  const { dateStr: todayStr } = getIstNow();
  const currentMonthKey = todayStr.slice(0, 7);
  const monthOptions = getLast6Months(6);

  // Period mode: 'month' | 'package' | 'all'
  const hasMultiplePlans = Boolean(packages && packages.length > 1);
  const [periodType, setPeriodType] = useState<'month' | 'package' | 'all'>(
    hasMultiplePlans ? 'all' : 'month'
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    activePackage?.id || null
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    initialMonthKey || currentMonthKey
  );

  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Selected package for single-package view
  const targetPkg = periodType === 'package'
    ? (packages?.find((p) => p.id === selectedPackageId) || activePackage)
    : activePackage;

  // Generate Bank Statement data model with full collation support
  const statementData: StatementSummaryData = generateBankStatementData(
    periodType,
    selectedMonthKey,
    records,
    targetPkg,
    config,
    'Household Account',
    packages
  );

  const handleShareToWhatsApp = async () => {
    setIsProcessing(true);
    setActionStatus('Generating PDF for WhatsApp...');
    try {
      const res = await shareStatementToWhatsApp(statementData, config);
      if (res.method === 'native_share') {
        setActionStatus('PDF sent to WhatsApp!');
      } else {
        setActionStatus('PDF downloaded! Opening WhatsApp...');
      }
      setTimeout(() => setActionStatus(null), 3500);
    } catch (err: any) {
      setActionStatus('Error preparing share: ' + (err?.message || 'Try Download PDF'));
      setTimeout(() => setActionStatus(null), 3500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = () => {
    setIsProcessing(true);
    setActionStatus('Downloading official PDF statement...');
    try {
      downloadStatementPdf(statementData);
      setActionStatus('PDF downloaded successfully!');
      setTimeout(() => setActionStatus(null), 3000);
    } catch (err: any) {
      setActionStatus('Download failed: ' + err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCsv = () => {
    exportStatementCsv(statementData);
    setActionStatus('CSV spreadsheet downloaded!');
    setTimeout(() => setActionStatus(null), 3000);
  };

  const handleCopySummary = () => {
    const text = generateFullBankStatementText(statementData);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '94vh',
          backgroundColor: '#0f172a', // Bank Navy background
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'iosModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '15.5px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Food Statement &amp; PDF Extract
                </h2>
                <InfoPopover
                  title="Food Statement & WhatsApp PDF"
                  color="#34d399"
                  content="This food statement details all daily meals, dish names, pricing, and carry-over savings. Tap 'Share PDF to WhatsApp' to directly send the official document to your cook, or Download PDF for your accounting records."
                />
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                Itemized food statement with daily meal logs &amp; carry-overs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-icon-btn"
            title="Close Statement"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* PERIOD SELECTION BAR */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>
                Statement Scope &amp; Period
              </span>
              <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                Ref: {statementData.statementId}
              </span>
            </div>

            <div>
              <select
                value={
                  periodType === 'all'
                    ? '__all__'
                    : periodType === 'package'
                    ? `__pkg_${targetPkg?.id || 'active'}__`
                    : selectedMonthKey
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__all__') {
                    setPeriodType('all');
                  } else if (val.startsWith('__pkg_')) {
                    const pkgId = val.replace(/^__pkg_/, '').replace(/__$/, '');
                    setSelectedPackageId(pkgId);
                    setPeriodType('package');
                  } else {
                    setSelectedMonthKey(val);
                    setPeriodType('month');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {Boolean(packages && packages.length > 1) && (
                  <option value="__all__" style={{ background: '#0f172a', color: '#34d399', fontWeight: 700 }}>
                    📋 All Plans Collated (Full Subscription Cycle)
                  </option>
                )}
                {packages && packages.length > 0 ? (
                  <optgroup label="Individual Subscription Plans" style={{ background: '#0f172a', color: '#94a3b8' }}>
                    {packages.map((p) => (
                      <option key={p.id} value={`__pkg_${p.id}__`} style={{ background: '#1e293b', color: '#ffffff' }}>
                        📦 {p.title} (Started {p.startDate})
                      </option>
                    ))}
                  </optgroup>
                ) : activePackage ? (
                  <option value={`__pkg_${activePackage.id}__`} style={{ background: '#1e293b', color: '#34d399', fontWeight: 700 }}>
                    📦 Active Plan: {activePackage.title}
                  </option>
                ) : null}
                <optgroup label="Monthly Statements" style={{ background: '#0f172a', color: '#94a3b8' }}>
                  {monthOptions.map((m) => (
                    <option key={m.key} value={m.key} style={{ background: '#1e293b', color: '#ffffff' }}>
                      📅 {m.label} Monthly Statement
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* DATE RANGE BANNER */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 95, 70, 0.2) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#34d399" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                  📅 From: <span style={{ color: '#34d399' }}>{statementData.startDate}</span> To: <span style={{ color: '#34d399' }}>{statementData.endDate}</span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  {statementData.periodLabel}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.2)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}
            >
              {statementData.rows.length} Ledger Entries
            </span>
          </div>

          {/* COLLATED SUBSCRIPTION PLANS CARDS (Crucial: Collate Breakfast + Lunch Plans) */}
          {statementData.collatedPlans && statementData.collatedPlans.length > 0 && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📋 Collated Plans ({statementData.collatedPlans.length} Active Subscriptions)
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>
                  Combined Balance: {statementData.currency}{statementData.netRemainingBalance.toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: statementData.collatedPlans.length > 1 ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr', gap: '8px' }}>
                {statementData.collatedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px' }}>{plan.mealType === 'Breakfast' ? '🍳' : plan.mealType === 'Lunch' ? '🍱' : '🍽️'}</span>
                        <strong style={{ fontSize: '12.5px', color: '#f8fafc' }}>{plan.title}</strong>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: plan.mealType === 'Breakfast' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                          color: plan.mealType === 'Breakfast' ? '#fbbf24' : '#34d399',
                        }}
                      >
                        {plan.mealType}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Rate: {statementData.currency}{plan.rate}/plate ({plan.persons}p = {statementData.currency}{plan.dailyCost}/day) · Start: {plan.startDate}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '6px 8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>Deposited</div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#f8fafc' }}>
                          {statementData.currency}{plan.amountPaid.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>{plan.totalDays} days</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>Delivered</div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#38bdf8' }}>
                          {statementData.currency}{plan.spent.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>{plan.daysDelivered} days</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: '#059669', textTransform: 'uppercase' }}>Remaining</div>
                        <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#34d399' }}>
                          {statementData.currency}{plan.remainingBalance.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '8.5px', color: '#34d399' }}>{plan.remainingDays}d left</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOOD STATEMENT CARD PREVIEW */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-md)',
              color: '#0f172a',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              border: '1px solid #cbd5e1',
            }}
          >
            {/* BANK HEADER STRIP */}
            <div
              style={{
                background: '#0f172a',
                padding: '10px 14px',
                borderBottom: '3px solid #10b981',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.8px' }}>
                  TIFFINFLOW
                </div>
                <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Subscription Account &amp; Meal Ledger Statement
                </div>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    fontFamily: 'monospace',
                  }}
                >
                  {statementData.statementId}
                </span>
              </div>
            </div>

            {/* PARTIES INFO */}
            <div
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '11px',
              }}
            >
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Service Provider / Caterer
                </div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px', marginTop: '1px' }}>
                  {statementData.catererName}
                </div>
                <div style={{ color: '#64748b', fontSize: '10px' }}>
                  {statementData.catererPhone || 'Contact not specified'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Statement Period
                </div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px', marginTop: '1px' }}>
                  {statementData.periodLabel}
                </div>
                <div style={{ color: '#059669', fontSize: '10.5px', fontWeight: 600 }}>
                  {statementData.startDate} to {statementData.endDate}
                </div>
              </div>
            </div>

            {/* 4 SUMMARY METRIC CARDS - CLEAN 2x2 MOBILE-FRIENDLY GRID */}
            <div
              style={{
                padding: '10px 14px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
              }}
            >
              {/* Card 1 */}
              <div
                style={{
                  background: '#f1f5f9',
                  padding: '9px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.4px' }}>TOTAL DEBITED</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '2px 0 1px' }}>
                  {statementData.currency}{statementData.totalSpent.toLocaleString()}
                </div>
                <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                  {statementData.effectiveDaysConsumed} days used
                </div>
              </div>

              {/* Card 2 */}
              <div
                style={{
                  background: '#ecfdf5',
                  padding: '9px 10px',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0',
                }}
              >
                <div style={{ fontSize: '9px', color: '#059669', fontWeight: 700, letterSpacing: '0.4px' }}>MEALS SERVED</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#065f46', margin: '2px 0 1px' }}>
                  {statementData.breakfastDelivered + statementData.lunchDelivered}
                </div>
                <div style={{ fontSize: '9.5px', color: '#059669' }}>
                  🍳 {statementData.breakfastDelivered} · 🍱 {statementData.lunchDelivered}
                </div>
              </div>

              {/* Card 3 */}
              <div
                style={{
                  background: '#fffbeb',
                  padding: '9px 10px',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                }}
              >
                <div style={{ fontSize: '9px', color: '#b45309', fontWeight: 700, letterSpacing: '0.4px' }}>CARRY-OVER CREDIT</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#92400e', margin: '2px 0 1px' }}>
                  +{statementData.carryOverDaysSaved}d
                </div>
                <div style={{ fontSize: '9.5px', color: '#b45309' }}>
                  {statementData.currency}{statementData.totalCarriedOverValue.toLocaleString()} saved
                </div>
              </div>

              {/* Card 4 */}
              <div
                style={{
                  background: '#f0f9ff',
                  padding: '9px 10px',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd',
                }}
              >
                <div style={{ fontSize: '9px', color: '#0369a1', fontWeight: 700, letterSpacing: '0.4px' }}>NET REMAINING BALANCE</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0c4a6e', margin: '2px 0 1px' }}>
                  {statementData.currency}{statementData.netRemainingBalance.toLocaleString()}
                </div>
                <div style={{ fontSize: '9.5px', color: '#0369a1' }}>
                  {statementData.remainingDays} days remaining
                </div>
              </div>
            </div>

            {/* LEDGER TRANSACTIONS TITLE */}
            <div
              style={{
                padding: '10px 14px 6px 14px',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                Itemized Daily Meal Ledger &amp; Comments
              </span>
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                Bank Passbook View
              </span>
            </div>

            {/* SCROLLABLE TRANSACTION TABLE - 6 BANK PASSBOOK COLUMNS */}
            <div style={{ maxHeight: '250px', overflowY: 'auto', overflowX: 'auto', borderTop: '1px solid #e2e8f0', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '460px', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700 }}>Date &amp; Day</th>
                    <th style={{ padding: '8px 8px', fontSize: '10px', fontWeight: 700 }}>Meal &amp; Plan</th>
                    <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700 }}>Food, Dish &amp; Comments</th>
                    <th style={{ padding: '8px 8px', fontSize: '10px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '8px 8px', fontSize: '10px', fontWeight: 700, textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statementData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        No meals or logs recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    statementData.rows.map((row, idx) => {
                      const isDelivered = row.status === 'DELIVERED';
                      const isSkipped = row.status === 'SKIPPED';
                      const isCookOff = row.status === 'COOK OFF';
                      const sessionEmoji = row.session === 'Breakfast' ? '🍳' : row.session === 'Lunch' ? '🍱' : '🏖️';

                      return (
                        <tr
                          key={idx}
                          style={{
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, fontSize: '11px' }}>{row.dateFormatted}</div>
                          </td>
                          <td style={{ padding: '8px 8px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, fontSize: '11px' }}>{sessionEmoji} {row.session}</div>
                            {row.planName && (
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>{row.planName}</div>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#0f172a' }}>
                            <div style={{ fontWeight: 600, fontSize: '11.5px' }}>{row.dish}</div>
                            {row.notes && row.notes !== 'Kitchen closed - full carry-over credited' && !row.notes.startsWith('Auto-delivered') && (
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: '#334155',
                                  marginTop: '2px',
                                  background: '#f1f5f9',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  borderLeft: '2px solid #3b82f6',
                                  display: 'inline-block',
                                }}
                              >
                                💬 {row.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isDelivered
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : isSkipped
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : isCookOff
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(139, 92, 246, 0.15)',
                                color: isDelivered
                                  ? '#059669'
                                  : isSkipped
                                  ? '#d97706'
                                  : isCookOff
                                  ? '#dc2626'
                                  : '#7c3aed',
                              }}
                            >
                              {isDelivered
                                ? `✓ ${row.persons}p`
                                : isSkipped
                                ? '⏸ Skip'
                                : isCookOff
                                ? '🏖️ Cook Off'
                                : `+${row.persons}p`}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '8px 8px',
                              textAlign: 'right',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              color: row.debit > 0 ? '#0f172a' : '#64748b',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.debit > 0 ? `${statementData.currency}${row.debit}` : '₹0'}
                          </td>
                          <td
                            style={{
                              padding: '8px 10px',
                              textAlign: 'right',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              color: '#059669',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.runningBalance !== undefined ? `${statementData.currency}${row.runningBalance.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* STATEMENT VERIFICATION FOOTER */}
            <div
              style={{
                padding: '8px 14px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '9px',
                color: '#64748b',
              }}
            >
              <span>Verified Electronic Record · TiffinFlow Engine</span>
              <span>Generated: {statementData.generatedAt}</span>
            </div>
          </div>

          {/* ACTION NOTIFICATION BANNER */}
          {actionStatus && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>{actionStatus}</span>
            </div>
          )}

        </div>

        {/* BOTTOM FIXED ACTION BUTTONS */}
        <div
          style={{
            padding: '12px 14px',
            background: '#090d16',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Primary Action: Share PDF to WhatsApp */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleShareToWhatsApp}
            className="ios-btn ios-btn-whatsapp"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '13.5px',
              fontWeight: 700,
              gap: '8px',
              cursor: isProcessing ? 'wait' : 'pointer',
            }}
          >
            <Share2 size={17} />
            <span>Share PDF Statement to WhatsApp</span>
          </button>

          {/* Secondary Actions: 2 Equal Columns for Download & CSV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleDownloadPdf}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '10px 8px', fontSize: '12px', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExportCsv}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '10px 8px', fontSize: '12px', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <FileSpreadsheet size={14} color="#34d399" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Tertiary Action: Copy WhatsApp Text Summary */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleCopySummary}
            className="ios-btn ios-btn-secondary"
            style={{ width: '100%', padding: '9px 12px', fontSize: '12px', gap: '6px' }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Statement Text Copied!' : 'Copy WhatsApp Text Summary'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
