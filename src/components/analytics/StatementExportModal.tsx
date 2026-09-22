import React, { useState } from 'react';
import { DayRecord, PackagePlan, RateConfig } from '../../types';
import {
  generateBankStatementData,
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
} from 'lucide-react';
import { InfoPopover } from '../common/InfoPopover';

interface StatementExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: Record<string, DayRecord>;
  activePackage: PackagePlan | null;
  config: RateConfig;
  initialMonthKey?: string;
}

export const StatementExportModal: React.FC<StatementExportModalProps> = ({
  isOpen,
  onClose,
  records,
  activePackage,
  config,
  initialMonthKey,
}) => {
  const { dateStr: todayStr } = getIstNow();
  const currentMonthKey = todayStr.slice(0, 7);
  const monthOptions = getLast6Months(6);

  // Period mode: 'month' | 'package'
  const [periodType, setPeriodType] = useState<'month' | 'package'>(
    activePackage ? 'month' : 'month'
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    initialMonthKey || currentMonthKey
  );

  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Generate Bank Statement data model
  const statementData: StatementSummaryData = generateBankStatementData(
    periodType,
    selectedMonthKey,
    records,
    activePackage,
    config
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
    const text = `🍽️ *Tiffin & Meal Statement - ${statementData.periodLabel}*
Caterer: ${statementData.catererName}
Total Meals Served: 🍳 ${statementData.breakfastDelivered} Breakfast | 🍱 ${statementData.lunchDelivered} Lunch
Total Consumed Value: ${statementData.currency}${statementData.totalSpent.toLocaleString()}
Carry-over Days Saved: ${statementData.carryOverDaysSaved} Days (${statementData.currency}${statementData.carriedOverValue.toLocaleString()})
Remaining Days in Plan: ${statementData.remainingDays} Days
Statement Ref: ${statementData.statementId}

Generated via TiffinFlow Bank Statement`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
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
        padding: '12px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
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
            padding: '16px 20px',
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
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Meal Statement &amp; PDF Extract
                </h2>
                <InfoPopover
                  title="Statement & WhatsApp PDF"
                  color="#34d399"
                  content="This bank-style statement details all daily meals, dish names, pricing, and carry-over savings. Tap 'Share PDF to WhatsApp' to directly send the official document to your cook, or Download PDF for your accounting records."
                />
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                Bank-statement look-alike with daily food logs &amp; carry-overs
              </p>
            </div>
          </div>
          <button
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
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px' }}>
                Select Statement Scope
              </span>
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                Ref: {statementData.statementId}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Boolean(activePackage && activePackage.status === 'active') && (
                <button
                  type="button"
                  onClick={() => setPeriodType('package')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: periodType === 'package' ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: periodType === 'package' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: periodType === 'package' ? '#34d399' : '#94a3b8',
                  }}
                >
                  📦 Active Plan ({activePackage?.title})
                </button>
              )}

              <select
                value={selectedMonthKey}
                onChange={(e) => {
                  setSelectedMonthKey(e.target.value);
                  setPeriodType('month');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: periodType === 'month' ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: periodType === 'month' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: periodType === 'month' ? '#34d399' : '#94a3b8',
                  outline: 'none',
                }}
              >
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key} style={{ background: '#1e293b', color: '#ffffff' }}>
                    📅 {m.label} Monthly Statement
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* BANK STATEMENT CARD PREVIEW */}
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
                padding: '12px 16px',
                borderBottom: '3px solid #10b981',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
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
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '3px 7px',
                    borderRadius: '4px',
                  }}
                >
                  {statementData.statementId}
                </span>
              </div>
            </div>

            {/* PARTIES INFO */}
            <div
              style={{
                padding: '12px 16px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
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
                <div style={{ color: '#64748b', fontSize: '10px' }}>
                  {statementData.startDate} to {statementData.endDate}
                </div>
              </div>
            </div>

            {/* 4 SUMMARY METRIC CARDS (BANK BALANCE BLOCK) */}
            <div
              style={{
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              {/* Card 1 */}
              <div
                style={{
                  background: '#f1f5f9',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 600 }}>TOTAL DEBITED</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {statementData.currency}{statementData.totalSpent.toLocaleString()}
                </div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>
                  {statementData.effectiveDaysConsumed} days used
                </div>
              </div>

              {/* Card 2 */}
              <div
                style={{
                  background: '#ecfdf5',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0',
                }}
              >
                <div style={{ fontSize: '8.5px', color: '#059669', fontWeight: 600 }}>MEALS SERVED</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#065f46', marginTop: '2px' }}>
                  {statementData.breakfastDelivered + statementData.lunchDelivered}
                </div>
                <div style={{ fontSize: '8px', color: '#059669' }}>
                  🍳 {statementData.breakfastDelivered} | 🍱 {statementData.lunchDelivered}
                </div>
              </div>

              {/* Card 3 */}
              <div
                style={{
                  background: '#fffbeb',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #fde68a',
                }}
              >
                <div style={{ fontSize: '8.5px', color: '#b45309', fontWeight: 600 }}>CARRY-OVER CREDIT</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
                  +{statementData.carryOverDaysSaved}d
                </div>
                <div style={{ fontSize: '8px', color: '#b45309' }}>
                  {statementData.currency}{statementData.carriedOverValue.toLocaleString()} saved
                </div>
              </div>

              {/* Card 4 */}
              <div
                style={{
                  background: '#f0f9ff',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd',
                }}
              >
                <div style={{ fontSize: '8.5px', color: '#0369a1', fontWeight: 600 }}>REMAINING PLAN</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0c4a6e', marginTop: '2px' }}>
                  {statementData.remainingDays}d
                </div>
                <div style={{ fontSize: '8px', color: '#0369a1' }}>
                  of {statementData.totalDays} total
                </div>
              </div>
            </div>

            {/* LEDGER TRANSACTIONS TITLE */}
            <div
              style={{
                padding: '10px 16px 6px 16px',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                Itemized Daily Meal Ledger ({statementData.rows.length} records)
              </span>
              <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                All daily dishes &amp; status
              </span>
            </div>

            {/* SCROLLABLE TRANSACTION TABLE */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', borderTop: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '6px 10px', fontSize: '9px', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 600 }}>Session</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 600 }}>Dish / Food Item</th>
                    <th style={{ padding: '6px 8px', fontSize: '9px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '6px 10px', fontSize: '9px', fontWeight: 600, textAlign: 'right' }}>Debit</th>
                  </tr>
                </thead>
                <tbody>
                  {statementData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        No meals or logs recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    statementData.rows.map((row, idx) => {
                      const isDelivered = row.status === 'DELIVERED';
                      const isSkipped = row.status === 'SKIPPED';
                      const isCookOff = row.status === 'COOK OFF';
                      const isExtra = row.status === 'EXTRA';

                      return (
                        <tr
                          key={idx}
                          style={{
                            background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <td style={{ padding: '6px 10px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                            {row.dateFormatted}
                          </td>
                          <td style={{ padding: '6px 8px', color: '#475569' }}>
                            {row.session === 'Breakfast' ? '🍳 Breakfast' : row.session === 'Lunch' ? '🍱 Lunch' : '🏖️ Cook Off'}
                          </td>
                          <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 500 }}>
                            <div>{row.dish}</div>
                            {row.notes && (
                              <div style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic' }}>
                                {row.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '8.5px',
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
                              {row.status}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '6px 10px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: row.debit > 0 ? '#0f172a' : '#94a3b8',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.debit > 0 ? `${statementData.currency}${row.debit}` : '₹0.00'}
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
            padding: '14px 20px',
            background: '#090d16',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
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
              padding: '14px',
              fontSize: '14px',
              fontWeight: 700,
              gap: '10px',
              cursor: isProcessing ? 'wait' : 'pointer',
            }}
          >
            <Share2 size={18} />
            <span>Share PDF Statement to WhatsApp</span>
          </button>

          {/* Secondary Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleDownloadPdf}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '10px', fontSize: '12px', gap: '6px' }}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExportCsv}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '10px', fontSize: '12px', gap: '6px' }}
            >
              <FileSpreadsheet size={15} color="#34d399" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCopySummary}
              className="ios-btn ios-btn-secondary"
              style={{ padding: '10px', fontSize: '12px', gap: '6px' }}
            >
              {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
