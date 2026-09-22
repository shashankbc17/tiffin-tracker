import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DayRecord, PackagePlan, RateConfig } from '../types';
import { getIstNow, isMealActiveOnDate } from './carryOverEngine';

export interface StatementLedgerRow {
  dateStr: string;
  dateFormatted: string;
  session: 'Breakfast' | 'Lunch' | 'Cook Holiday';
  dish: string;
  status: 'DELIVERED' | 'SKIPPED' | 'EXTRA' | 'COOK OFF';
  persons: number;
  rate: number;
  debit: number;
  carryOverEffect: string;
  notes?: string;
}

export interface StatementSummaryData {
  statementId: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  catererName: string;
  catererPhone: string;
  subscriberName: string;
  packageTitle: string;
  totalDays: number;
  effectiveDaysConsumed: number;
  carryOverDaysSaved: number;
  remainingDays: number;
  originalEndDate?: string;
  extendedEndDate?: string;
  breakfastDelivered: number;
  breakfastSkipped: number;
  lunchDelivered: number;
  lunchSkipped: number;
  cookOffDays: number;
  totalSpent: number;
  carriedOverValue: number;
  currency: string;
  rows: StatementLedgerRow[];
}

/**
 * Compile bank-style statement data for a given month ('YYYY-MM') or active package cycle
 */
export function generateBankStatementData(
  periodType: 'month' | 'package',
  monthKey: string, // e.g. '2026-09'
  records: Record<string, DayRecord>,
  pkg: PackagePlan | null,
  config: RateConfig,
  subscriberName = 'Household Account'
): StatementSummaryData {
  const currency = config.currency || '₹';
  const planPersons = pkg?.defaultPersons || config.defaultPersons || 1;
  const defaultBRate = pkg?.breakfastRate || config.defaultBreakfastRate || 60;
  const defaultLRate = pkg?.lunchRate || config.defaultLunchRate || 90;
  const { dateStr: todayStr, formattedDate: todayFormatted } = getIstNow();

  let targetDates: string[] = [];
  let periodLabel = '';
  let startDate = '';
  let endDate = '';

  if (periodType === 'month') {
    const [y, m] = monthKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    periodLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    targetDates = Object.keys(records)
      .filter((d) => d.startsWith(monthKey))
      .sort();
    
    // Also include all days of this month up to today if package started
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!targetDates.includes(dStr)) {
        if (pkg && dStr >= pkg.startDate && dStr <= todayStr) {
          targetDates.push(dStr);
        }
      }
    }
    targetDates.sort();
    startDate = targetDates[0] || `${monthKey}-01`;
    endDate = targetDates[targetDates.length - 1] || `${monthKey}-${daysInMonth}`;
  } else {
    // Package cycle
    periodLabel = pkg ? `${pkg.title} (Full Cycle)` : 'Active Subscription Cycle';
    startDate = pkg?.startDate || todayStr;
    targetDates = Object.keys(records)
      .filter((d) => !pkg || d >= pkg.startDate)
      .sort();
    endDate = targetDates[targetDates.length - 1] || todayStr;
  }

  let totalSpent = 0;
  let carriedOverValue = 0;
  let breakfastDelivered = 0;
  let breakfastSkipped = 0;
  let lunchDelivered = 0;
  let lunchSkipped = 0;
  let cookOffDays = 0;

  const rows: StatementLedgerRow[] = [];

  for (const dateStr of targetDates) {
    const rec = records[dateStr];
    const isFuture = dateStr > todayStr;
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      weekday: 'short',
    });

    const isBActive = pkg ? isMealActiveOnDate(dateStr, pkg, 'breakfast') : true;
    const isLActive = pkg ? isMealActiveOnDate(dateStr, pkg, 'lunch') : true;

    // Cook holiday
    if (rec?.isCookOff) {
      cookOffDays++;
      const bPersons = planPersons;
      const lPersons = planPersons;
      if (isBActive) {
        breakfastSkipped += bPersons;
        carriedOverValue += defaultBRate * bPersons;
      }
      if (isLActive) {
        lunchSkipped += lPersons;
        carriedOverValue += defaultLRate * lPersons;
      }

      rows.push({
        dateStr,
        dateFormatted,
        session: 'Cook Holiday',
        dish: 'Cook Off / Holiday (No Meals Served)',
        status: 'COOK OFF',
        persons: planPersons,
        rate: 0,
        debit: 0,
        carryOverEffect: '+1.0 Day Credit',
        notes: rec.notes || 'Kitchen closed - full carry-over credited',
      });
      continue;
    }

    // Breakfast
    if (rec?.breakfast && (isBActive || rec.breakfast.status !== 'none')) {
      const b = rec.breakfast;
      const rate = b.rate || defaultBRate;
      const persons = b.persons || planPersons;

      if (!isFuture && (b.status === 'delivered' || b.status === 'extra')) {
        breakfastDelivered += persons;
        const debit = rate * persons;
        totalSpent += debit;
        rows.push({
          dateStr,
          dateFormatted,
          session: 'Breakfast',
          dish: b.menuItem || b.notes || 'Standard Breakfast Preparation',
          status: b.status === 'extra' ? 'EXTRA' : 'DELIVERED',
          persons,
          rate,
          debit,
          carryOverEffect: 'None (Consumed)',
          notes: b.autoDelivered ? 'Auto-delivered on schedule' : b.notes,
        });

        // Check if fewer persons delivered than scheduled
        if (b.status === 'delivered' && persons < planPersons && isBActive) {
          const missed = planPersons - persons;
          breakfastSkipped += missed;
          carriedOverValue += rate * missed;
          rows.push({
            dateStr,
            dateFormatted,
            session: 'Breakfast',
            dish: 'Partial Delivery Adjustment',
            status: 'SKIPPED',
            persons: missed,
            rate,
            debit: 0,
            carryOverEffect: `+${Math.round((missed / (planPersons * 2)) * 10) / 10} Day Credit`,
            notes: `${missed} person portion not served`,
          });
        }
      } else if (b.status === 'skipped' && isBActive) {
        breakfastSkipped += persons;
        carriedOverValue += rate * persons;
        rows.push({
          dateStr,
          dateFormatted,
          session: 'Breakfast',
          dish: b.menuItem || b.notes || 'Meal Skipped / Paused by User',
          status: 'SKIPPED',
          persons,
          rate,
          debit: 0,
          carryOverEffect: '+0.5 Day Credit',
          notes: b.notes || 'Carried over to extended package date',
        });
      }
    }

    // Lunch
    if (rec?.lunch && (isLActive || rec.lunch.status !== 'none')) {
      const l = rec.lunch;
      const rate = l.rate || defaultLRate;
      const persons = l.persons || planPersons;

      if (!isFuture && (l.status === 'delivered' || l.status === 'extra')) {
        lunchDelivered += persons;
        const debit = rate * persons;
        totalSpent += debit;
        rows.push({
          dateStr,
          dateFormatted,
          session: 'Lunch',
          dish: l.menuItem || l.notes || 'Standard Lunch Preparation',
          status: l.status === 'extra' ? 'EXTRA' : 'DELIVERED',
          persons,
          rate,
          debit,
          carryOverEffect: 'None (Consumed)',
          notes: l.autoDelivered ? 'Auto-delivered on schedule' : l.notes,
        });

        if (l.status === 'delivered' && persons < planPersons && isLActive) {
          const missed = planPersons - persons;
          lunchSkipped += missed;
          carriedOverValue += rate * missed;
          rows.push({
            dateStr,
            dateFormatted,
            session: 'Lunch',
            dish: 'Partial Delivery Adjustment',
            status: 'SKIPPED',
            persons: missed,
            rate,
            debit: 0,
            carryOverEffect: `+${Math.round((missed / (planPersons * 2)) * 10) / 10} Day Credit`,
            notes: `${missed} person portion not served`,
          });
        }
      } else if (l.status === 'skipped' && isLActive) {
        lunchSkipped += persons;
        carriedOverValue += rate * persons;
        rows.push({
          dateStr,
          dateFormatted,
          session: 'Lunch',
          dish: l.menuItem || l.notes || 'Meal Skipped / Paused by User',
          status: 'SKIPPED',
          persons,
          rate,
          debit: 0,
          carryOverEffect: '+0.5 Day Credit',
          notes: l.notes || 'Carried over to extended package date',
        });
      }
    }
  }

  // Calculate carry-over stats
  const activeMealCount = ((pkg?.includesBreakfast !== false) ? 1 : 0) + ((pkg?.includesLunch !== false) ? 1 : 0);
  const dailyPortions = Math.max(1, activeMealCount * planPersons);
  const totalDeliveredPortions = breakfastDelivered + lunchDelivered;
  const totalSkippedPortions = breakfastSkipped + lunchSkipped;

  const effectiveDaysConsumed = Math.round((totalDeliveredPortions / dailyPortions) * 10) / 10;
  const carryOverDaysSaved = Math.round((totalSkippedPortions / dailyPortions) * 10) / 10;
  const totalDays = pkg?.totalDays || targetDates.length;
  const remainingDays = Math.max(0, Math.round((totalDays - effectiveDaysConsumed) * 10) / 10);

  // Generate unique statement ID
  const hashSeed = (startDate + endDate).replace(/-/g, '').slice(-4) || '9999';
  const statementId = `TF-STMT-${monthKey.replace('-', '')}-${hashSeed}`;

  return {
    statementId,
    periodLabel,
    startDate,
    endDate,
    generatedAt: `${todayFormatted}, ${getIstNow().hour.toString().padStart(2, '0')}:${getIstNow().minute.toString().padStart(2, '0')} IST`,
    catererName: config.catererName || 'Bhaiya / Tiffin Caterer',
    catererPhone: config.catererPhone || 'Not Configured',
    subscriberName,
    packageTitle: pkg?.title || 'Standard Monthly Meal Plan',
    totalDays,
    effectiveDaysConsumed,
    carryOverDaysSaved,
    remainingDays,
    originalEndDate: pkg?.startDate ? pkg.startDate : undefined,
    breakfastDelivered,
    breakfastSkipped,
    lunchDelivered,
    lunchSkipped,
    cookOffDays,
    totalSpent,
    carriedOverValue,
    currency,
    rows,
  };
}

/**
 * Generate a formal bank-statement look-alike PDF document using jsPDF & autoTable
 */
export function generateStatementPdf(data: StatementSummaryData): {
  doc: jsPDF;
  blob: Blob;
  filename: string;
  dataUri: string;
} {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. TOP HEADER BANNER (Navy Bank Style)
  doc.setFillColor(15, 23, 42); // #0f172a (Deep Slate / Bank Navy)
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Emerald accent stripe
  doc.setFillColor(16, 185, 129); // #10b981 (Emerald Green)
  doc.rect(0, 27, pageWidth, 2.5, 'F');

  // Brand Name & Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TIFFINFLOW', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text('SUBSCRIPTION ACCOUNT & MEAL LEDGER STATEMENT', margin, 18);

  // Statement Ref ID on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(52, 211, 153); // Emerald text
  doc.text(data.statementId, pageWidth - margin, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${data.generatedAt}`, pageWidth - margin, 18, { align: 'right' });

  let y = 36;

  // 2. BANK ACCOUNT & PARTY METADATA GRID (Two Columns)
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'FD');

  // Column 1: Caterer / Service Provider
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SERVICE PROVIDER / CATERER', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.catererName, margin + 4, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact: ${data.catererPhone}`, margin + 4, y + 17);

  // Column 2: Subscriber & Period
  const midX = margin + (pageWidth - margin * 2) / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SUBSCRIBER & STATEMENT PERIOD', midX, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.packageTitle, midX, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Period: ${data.periodLabel} (${data.startDate} to ${data.endDate})`, midX, y + 17);

  y += 28;

  // 3. EXECUTIVE ACCOUNT SUMMARY CARDS (Like Bank Balance Summary)
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 21;

  // Card 1: Consumed Value
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DEBITED', margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.currency}${data.totalSpent.toLocaleString()}`, margin + 3, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.effectiveDaysConsumed} days consumed`, margin + 3, y + 17);

  // Card 2: Meals Delivered
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(c2X, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('MEALS SERVED', c2X + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(`🍳 ${data.breakfastDelivered} | 🍱 ${data.lunchDelivered}`, c2X + 3, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text(`${data.breakfastDelivered + data.lunchDelivered} total portions`, c2X + 3, y + 17);

  // Card 3: Carried-over Credit
  const c3X = c2X + cardWidth + 3;
  doc.setFillColor(254, 243, 199); // amber-50
  doc.roundedRect(c3X, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('CARRY-OVER CREDIT', c3X + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text(`${data.currency}${data.carriedOverValue.toLocaleString()}`, c3X + 3, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text(`+${data.carryOverDaysSaved} Days Saved`, c3X + 3, y + 17);

  // Card 4: Remaining Plan Balance
  const c4X = c3X + cardWidth + 3;
  doc.setFillColor(240, 249, 255); // sky-50
  doc.roundedRect(c4X, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161); // sky-700
  doc.text('REMAINING BALANCE', c4X + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(12, 74, 110); // sky-900
  doc.text(`${data.remainingDays} Days`, c4X + 3, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(3, 105, 161);
  doc.text(`Total Plan: ${data.totalDays} Days`, c4X + 3, y + 17);

  y += cardHeight + 6;

  // Section title for ledger
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ITEMIZED MEAL TRANSACTIONS & FOOD LOG', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('DAILY MEAL LEDGER & CHARGES (Itemized Records)', margin, y + 4);

  y += 6;

  // 4. TRANSACTION LEDGER TABLE (Clean, spacious, elderly & cook friendly)
  const tableData = data.rows.map((row) => {
    const sessionLabel = row.session === 'Breakfast' ? 'Breakfast' : row.session === 'Lunch' ? 'Lunch' : 'Holiday';
    const dateAndMeal = `${row.dateFormatted}\n(${sessionLabel})`;

    const dishDetails = row.notes && row.notes !== 'Kitchen closed - full carry-over credited' && !row.notes.startsWith('Auto-delivered')
      ? `${row.dish}\nNote: ${row.notes}`
      : row.dish;

    const statusText =
      row.status === 'DELIVERED'
        ? `Delivered (${row.persons} plate${row.persons > 1 ? 's' : ''})`
        : row.status === 'SKIPPED'
        ? `Skipped (+${row.carryOverEffect})`
        : row.status === 'COOK OFF'
        ? 'Cook Holiday (Credit)'
        : `Extra (${row.persons} plate${row.persons > 1 ? 's' : ''})`;

    const amountText = row.debit > 0 ? `${data.currency}${row.debit.toLocaleString()}` : '₹0 (Credit)';

    return [dateAndMeal, dishDetails, statusText, amountText];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 18 },
    head: [[
      'Date & Meal',
      'Food / Dish Description',
      'Delivery Status',
      'Amount'
    ]],
    body: tableData.length > 0 ? tableData : [[
      '-',
      'No recorded transactions in this period',
      '-',
      '₹0.00'
    ]],
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42], // Deep Navy
      textColor: [255, 255, 255],
      fontSize: 9.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 9.2,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // soft alternating zebra
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },
      1: { cellWidth: 84 },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', fontSize: 10 },
    },
    didParseCell: (hookData) => {
      // Color-code status column
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const text = String(hookData.cell.raw);
        if (text.startsWith('Delivered')) {
          hookData.cell.styles.textColor = [5, 150, 105]; // Emerald
        } else if (text.startsWith('Skipped')) {
          hookData.cell.styles.textColor = [217, 119, 6]; // Amber
        } else if (text.startsWith('Cook Holiday')) {
          hookData.cell.styles.textColor = [220, 38, 38]; // Red
        } else if (text.startsWith('Extra')) {
          hookData.cell.styles.textColor = [124, 58, 237]; // Purple
        }
      }
      // Highlight debit charges
      if (hookData.section === 'body' && hookData.column.index === 3) {
        const text = String(hookData.cell.raw);
        if (text !== '₹0 (Credit)' && text !== '₹0.00' && text !== '0') {
          hookData.cell.styles.textColor = [15, 23, 42];
        } else {
          hookData.cell.styles.textColor = [100, 116, 139];
        }
      }
    },
    didDrawPage: (hookData) => {
      // Add formal footer on each page
      const currentDoc = hookData.doc;
      const str = `Page ${hookData.pageNumber} · TiffinFlow Official Meal Subscription Ledger · Verified Electronic Record`;
      currentDoc.setFontSize(7.5);
      currentDoc.setTextColor(148, 163, 184);
      currentDoc.text(str, pageWidth / 2, pageHeight - 8, { align: 'center' });
      
      // Bottom emerald micro line
      currentDoc.setFillColor(16, 185, 129);
      currentDoc.rect(margin, pageHeight - 5, pageWidth - margin * 2, 0.8, 'F');
    },
  });

  // Filename
  const cleanLabel = data.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `TiffinFlow_Statement_${cleanLabel}.pdf`;

  const blob = doc.output('blob');
  const dataUri = doc.output('dataurlstring');

  return {
    doc,
    blob,
    filename,
    dataUri,
  };
}

/**
 * Trigger immediate client-side download of statement PDF
 */
export function downloadStatementPdf(data: StatementSummaryData): void {
  const { blob, filename } = generateStatementPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share statement directly to WhatsApp with companion text and downloadable attachment
 */
export async function shareStatementToWhatsApp(
  data: StatementSummaryData,
  config: RateConfig
): Promise<{ method: 'native_share' | 'download_and_whatsapp'; success: boolean; error?: string }> {
  const { blob, filename } = generateStatementPdf(data);

  let phone = config.catererPhone ? config.catererPhone.replace(/[^0-9]/g, '') : '';
  if (phone && phone.length === 10) {
    phone = `91${phone}`;
  }

  const companionMessage = `🍽️ *Tiffin Statement - ${data.periodLabel}*
Hi ${data.catererName},
• Meals Served: ${data.breakfastDelivered + data.lunchDelivered} (${data.currency}${data.totalSpent.toLocaleString()})
• Skips / Saved: ${data.carryOverDaysSaved} days (${data.currency}${data.carriedOverValue.toLocaleString()})
• Balance Days: ${data.remainingDays} days left

Attached is the official Food Statement PDF with itemized daily logs.`;

  const encoded = encodeURIComponent(companionMessage);
  const waUrl = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

  // Check if native file sharing is supported
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Meal Statement - ${data.periodLabel}`,
        text: companionMessage,
      });
      return { method: 'native_share', success: true };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'native_share', success: false, error: 'Cancelled by user' };
      }
      // If native share fails, fallback to download + web WhatsApp
    }
  }

  // Fallback for desktop & unsupported browsers:
  // 1. Download the PDF file directly
  downloadStatementPdf(data);

  // 2. Open WhatsApp link with pre-filled message
  window.open(waUrl, '_blank');

  return { method: 'download_and_whatsapp', success: true };
}

/**
 * Export Statement Ledger as CSV for Excel / Google Sheets
 */
export function exportStatementCsv(data: StatementSummaryData): void {
  const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

  const headers = [
    'Date',
    'Session',
    'Dish / Food Item',
    'Status',
    'Portions',
    'Rate',
    'Debit Amount',
    'Carry-Over Effect',
    'Notes',
  ];

  const metaRows = [
    ['STATEMENT TITLE', 'TIFFINFLOW MEAL SUBSCRIPTION ACCOUNT STATEMENT'],
    ['STATEMENT ID', data.statementId],
    ['PERIOD', `${data.periodLabel} (${data.startDate} to ${data.endDate})`],
    ['CATERER', `${data.catererName} (${data.catererPhone})`],
    ['TOTAL PLAN DAYS', `${data.totalDays}`],
    ['CONSUMED DAYS', `${data.effectiveDaysConsumed}`],
    ['CARRIED OVER DAYS SAVED', `${data.carryOverDaysSaved}`],
    ['REMAINING DAYS', `${data.remainingDays}`],
    ['TOTAL VALUE CONSUMED', `${data.currency}${data.totalSpent}`],
    ['CARRIED OVER VALUE SAVED', `${data.currency}${data.carriedOverValue}`],
    ['GENERATED AT', data.generatedAt],
    [],
  ];

  const csvRows: string[][] = [
    ...metaRows,
    headers,
    ...data.rows.map((r) => [
      r.dateStr,
      r.session,
      r.dish,
      r.status,
      String(r.persons),
      `${r.rate}`,
      `${r.debit}`,
      r.carryOverEffect,
      r.notes || '',
    ]),
  ];

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `TiffinFlow_Statement_${data.periodLabel.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
