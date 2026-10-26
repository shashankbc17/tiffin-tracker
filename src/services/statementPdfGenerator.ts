import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DayRecord, PackagePlan, RateConfig } from '../types';
import { getIstNow, isMealActiveOnDate, calculateCarryOver } from './carryOverEngine';

export interface StatementLedgerRow {
  dateStr: string;
  dateFormatted: string;
  dayOfWeek: string;
  session: 'Breakfast' | 'Lunch' | 'Cook Holiday';
  planName?: string;
  dish: string;
  status: 'DELIVERED' | 'SKIPPED' | 'EXTRA' | 'COOK OFF';
  persons: number;
  rate: number;
  debit: number;
  runningBalance?: number;
  carryOverEffect: string;
  notes?: string;
}

export interface PlanCollationSummary {
  id: string;
  title: string;
  mealType: 'Breakfast' | 'Lunch' | 'Both';
  startDate: string;
  rate: number;
  persons: number;
  dailyCost: number;
  totalDays: number;
  amountPaid: number;
  daysDelivered: number;
  daysSkipped: number;
  spent: number;
  remainingDays: number;
  remainingBalance: number;
  carryOverDays: number;
  extendedEndDate?: string;
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
  collatedPlans: PlanCollationSummary[];
  totalBudget: number;
  totalSpent: number;
  totalCarriedOverValue: number;
  netRemainingBalance: number;
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
  currency: string;
  rows: StatementLedgerRow[];
}

/**
 * Compile bank-style statement data for a given month ('YYYY-MM'), package, or all active plans
 */
export function generateBankStatementData(
  periodType: 'month' | 'package' | 'all',
  monthKey: string, // e.g. '2026-10'
  records: Record<string, DayRecord>,
  pkg: PackagePlan | null,
  config: RateConfig,
  subscriberName = 'Household Account',
  packages?: PackagePlan[]
): StatementSummaryData {
  const currency = config.currency || '₹';
  const { dateStr: todayStr, formattedDate: todayFormatted } = getIstNow();

  // 1. Identify all active packages to collate
  const activePackages = packages && packages.length > 0
    ? packages.filter((p) => p.status === 'active')
    : (pkg ? [pkg] : []);

  const bPkg = packages?.find((p) => p.status === 'active' && p.includesBreakfast) ||
    (pkg?.includesBreakfast ? pkg : null);
  const lPkg = packages?.find((p) => p.status === 'active' && p.includesLunch) ||
    (pkg?.includesLunch ? pkg : null);

  const defaultBRate = bPkg?.breakfastRate || config.defaultBreakfastRate || 50;
  const defaultLRate = lPkg?.lunchRate || config.defaultLunchRate || 120;
  const bPlanPersons = bPkg?.defaultPersons || config.defaultPersons || 2;
  const lPlanPersons = lPkg?.defaultPersons || config.defaultPersons || 1;

  // 2. Collate each plan's analytics
  const collatedPlans: PlanCollationSummary[] = activePackages.map((p) => {
    const pStats = calculateCarryOver(p, records, config);
    const pDaily = (p.includesBreakfast ? p.breakfastRate : 0) + (p.includesLunch ? p.lunchRate : 0);
    const pPersons = p.defaultPersons || 1;
    const dailyCost = pDaily * pPersons;
    const amountPaid = p.totalAmountPaid > 0 ? p.totalAmountPaid : (dailyCost * p.totalDays);
    const remainingBalance = Math.max(0, amountPaid - pStats.totalSpent);

    const mealType: 'Breakfast' | 'Lunch' | 'Both' =
      p.includesBreakfast && p.includesLunch ? 'Both' : p.includesBreakfast ? 'Breakfast' : 'Lunch';

    return {
      id: p.id,
      title: p.title,
      mealType,
      startDate: p.startDate,
      rate: p.includesBreakfast ? p.breakfastRate : p.lunchRate,
      persons: pPersons,
      dailyCost,
      totalDays: p.totalDays,
      amountPaid,
      daysDelivered: pStats.effectiveDaysConsumed,
      daysSkipped: pStats.carryOverDays,
      spent: pStats.totalSpent,
      remainingDays: pStats.remainingDays,
      remainingBalance,
      carryOverDays: pStats.carryOverDays,
      extendedEndDate: pStats.extendedEndDate,
    };
  });

  const totalBudget = collatedPlans.length > 0
    ? collatedPlans.reduce((sum, p) => sum + p.amountPaid, 0)
    : (pkg?.totalAmountPaid || 0);

  // 3. Determine target dates and period labels
  let targetDates: string[] = [];
  let periodLabel = '';
  let startDate = '';
  let endDate = '';

  const earliestStartDate = activePackages.reduce(
    (earliest, p) => (p.startDate < earliest ? p.startDate : earliest),
    todayStr
  );

  if (periodType === 'month') {
    const [y, m] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const dateObj = new Date(y, m - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    startDate = `${monthKey}-01`;
    const isCurrentMonth = monthKey === todayStr.slice(0, 7);
    endDate = isCurrentMonth ? todayStr : `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
    periodLabel = `${monthName} (${startDate} to ${endDate})`;

    // Filter dates strictly in this month window
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dStr <= endDate) {
        targetDates.push(dStr);
      }
    }
  } else if (periodType === 'all') {
    startDate = earliestStartDate;
    endDate = todayStr;
    periodLabel = `Full Subscription Period (${startDate} to ${endDate})`;

    const allRecordDates = Object.keys(records).filter((d) => d >= startDate && d <= endDate);
    const dateSet = new Set<string>(allRecordDates);
    dateSet.add(startDate);
    dateSet.add(endDate);
    targetDates = Array.from(dateSet).sort();
  } else {
    // Single package cycle
    startDate = pkg?.startDate || earliestStartDate;
    endDate = todayStr;
    periodLabel = `${pkg?.title || 'Active Subscription'} (${startDate} to ${endDate})`;
    targetDates = Object.keys(records)
      .filter((d) => (!pkg || d >= pkg.startDate) && d <= endDate)
      .sort();
  }

  // 4. Calculate Opening Balance before period start (bank style)
  let priorSpent = 0;
  for (const [d, rec] of Object.entries(records)) {
    if (d < startDate) {
      if (!rec.isCookOff) {
        if (rec.breakfast && (rec.breakfast.status === 'delivered' || rec.breakfast.status === 'extra')) {
          priorSpent += (rec.breakfast.rate || defaultBRate) * (rec.breakfast.persons || bPlanPersons);
        }
        if (rec.lunch && (rec.lunch.status === 'delivered' || rec.lunch.status === 'extra')) {
          priorSpent += (rec.lunch.rate || defaultLRate) * (rec.lunch.persons || lPlanPersons);
        }
      }
    }
  }

  let runningBalance = Math.max(0, totalBudget - priorSpent);

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
    });
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    const isBActive = bPkg ? (dateStr >= bPkg.startDate && isMealActiveOnDate(dateStr, bPkg, 'breakfast')) : true;
    const isLActive = lPkg ? (dateStr >= lPkg.startDate && isMealActiveOnDate(dateStr, lPkg, 'lunch')) : false;

    // Cook holiday / off day
    if (rec?.isCookOff) {
      cookOffDays++;
      if (isBActive) {
        breakfastSkipped += bPlanPersons;
        carriedOverValue += defaultBRate * bPlanPersons;
      }
      if (isLActive) {
        lunchSkipped += lPlanPersons;
        carriedOverValue += defaultLRate * lPlanPersons;
      }

      rows.push({
        dateStr,
        dateFormatted: `${dateFormatted} (${dayOfWeek})`,
        dayOfWeek,
        session: 'Cook Holiday',
        planName: 'All Plans',
        dish: 'Cook Off / Holiday (Kitchen Closed)',
        status: 'COOK OFF',
        persons: bPlanPersons,
        rate: 0,
        debit: 0,
        runningBalance,
        carryOverEffect: '+1.0 Day Credit (Preserved)',
        notes: rec.notes || 'Cook off / holiday (Carried over)',
      });
      continue;
    }

    // Breakfast transaction
    if (isBActive || (rec?.breakfast && rec.breakfast.status !== 'none')) {
      const b = rec?.breakfast;
      const rate = b?.rate || defaultBRate;
      const persons = b?.persons || bPlanPersons;
      const status = b?.status || 'none';

      if (!isFuture && (status === 'delivered' || status === 'extra')) {
        breakfastDelivered += persons;
        const debit = rate * persons;
        totalSpent += debit;
        runningBalance = Math.max(0, runningBalance - debit);

        rows.push({
          dateStr,
          dateFormatted: `${dateFormatted} (${dayOfWeek})`,
          dayOfWeek,
          session: 'Breakfast',
          planName: bPkg?.title || 'Breakfast Plan',
          dish: b?.menuItem || 'Standard Breakfast',
          status: status === 'extra' ? 'EXTRA' : 'DELIVERED',
          persons,
          rate,
          debit,
          runningBalance,
          carryOverEffect: 'None (Consumed)',
          notes: b?.notes,
        });
      } else if (status === 'skipped' && isBActive) {
        breakfastSkipped += persons;
        carriedOverValue += rate * persons;

        rows.push({
          dateStr,
          dateFormatted: `${dateFormatted} (${dayOfWeek})`,
          dayOfWeek,
          session: 'Breakfast',
          planName: bPkg?.title || 'Breakfast Plan',
          dish: b?.menuItem || 'Breakfast Skipped',
          status: 'SKIPPED',
          persons,
          rate,
          debit: 0,
          runningBalance,
          carryOverEffect: '+0.5 Day Credit',
          notes: b?.notes || 'Carried over to extended package date',
        });
      }
    }

    // Lunch transaction
    if (isLActive || (rec?.lunch && rec.lunch.status !== 'none')) {
      const l = rec?.lunch;
      const rate = l?.rate || defaultLRate;
      const persons = l?.persons || lPlanPersons;
      const status = l?.status || 'none';

      if (!isFuture && (status === 'delivered' || status === 'extra')) {
        lunchDelivered += persons;
        const debit = rate * persons;
        totalSpent += debit;
        runningBalance = Math.max(0, runningBalance - debit);

        rows.push({
          dateStr,
          dateFormatted: `${dateFormatted} (${dayOfWeek})`,
          dayOfWeek,
          session: 'Lunch',
          planName: lPkg?.title || 'Lunch Plan',
          dish: l?.menuItem || (persons === 1 ? '4 Chapathis' : 'Standard Lunch'),
          status: status === 'extra' ? 'EXTRA' : 'DELIVERED',
          persons,
          rate,
          debit,
          runningBalance,
          carryOverEffect: 'None (Consumed)',
          notes: l?.notes,
        });
      } else if (status === 'skipped' && isLActive) {
        lunchSkipped += persons;
        carriedOverValue += rate * persons;

        rows.push({
          dateStr,
          dateFormatted: `${dateFormatted} (${dayOfWeek})`,
          dayOfWeek,
          session: 'Lunch',
          planName: lPkg?.title || 'Lunch Plan',
          dish: l?.menuItem || 'Lunch Skipped',
          status: 'SKIPPED',
          persons,
          rate,
          debit: 0,
          runningBalance,
          carryOverEffect: '+0.5 Day Credit',
          notes: l?.notes || 'Carried over to extended package date',
        });
      }
    }
  }

  // 5. Carry-over totals
  const totalDays = collatedPlans.length > 0
    ? collatedPlans.reduce((sum, p) => sum + p.totalDays, 0)
    : (pkg?.totalDays || targetDates.length);

  const totalDeliveredPortions = breakfastDelivered + lunchDelivered;
  const totalSkippedPortions = breakfastSkipped + lunchSkipped;
  const effectiveDaysConsumed = collatedPlans.length > 0
    ? collatedPlans.reduce((sum, p) => sum + p.daysDelivered, 0)
    : Math.round((totalDeliveredPortions / 2) * 10) / 10;

  const carryOverDaysSaved = collatedPlans.length > 0
    ? collatedPlans.reduce((sum, p) => sum + p.daysSkipped, 0)
    : Math.round((totalSkippedPortions / 2) * 10) / 10;

  const totalCarriedOverValue = collatedPlans.length > 0
    ? collatedPlans.reduce((sum, p) => sum + (p.daysSkipped * p.dailyCost), 0)
    : carriedOverValue;

  const remainingDays = collatedPlans.length > 0
    ? collatedPlans.reduce((sum, p) => sum + p.remainingDays, 0)
    : Math.max(0, totalDays - effectiveDaysConsumed);

  const netRemainingBalance = collatedPlans.length > 0
    ? collatedPlans.reduce((sum, p) => sum + p.remainingBalance, 0)
    : Math.max(0, totalBudget - totalSpent);

  const packageTitle = collatedPlans.length > 1
    ? collatedPlans.map((p) => p.title).join(' + ')
    : (pkg?.title || 'Meal Subscription');

  // Generate unique statement ID
  const hashSeed = (startDate + endDate).replace(/-/g, '').slice(-4) || '9999';
  const statementId = `TF-STMT-${monthKey.replace('-', '')}-${hashSeed}`;

  return {
    statementId,
    periodLabel,
    startDate,
    endDate,
    generatedAt: `${todayFormatted}, ${getIstNow().hour.toString().padStart(2, '0')}:${getIstNow().minute.toString().padStart(2, '0')} IST`,
    catererName: config.catererName || 'Srinath (Caterer)',
    catererPhone: config.catererPhone || '+91 98868 63284',
    subscriberName,
    packageTitle,
    collatedPlans,
    totalBudget,
    totalSpent,
    totalCarriedOverValue,
    netRemainingBalance,
    totalDays,
    effectiveDaysConsumed,
    carryOverDaysSaved,
    remainingDays,
    breakfastDelivered,
    breakfastSkipped,
    lunchDelivered,
    lunchSkipped,
    cookOffDays,
    currency,
    rows,
  };
}

/**
 * Generate full itemized bank statement formatted text for WhatsApp & Clipboard
 */
export function generateFullBankStatementText(data: StatementSummaryData): string {
  const currency = data.currency || '₹';

  let plansText = '';
  if (data.collatedPlans && data.collatedPlans.length > 0) {
    plansText = data.collatedPlans
      .map(
        (p, idx) =>
          `${idx + 1}️⃣ *${p.title}* (${p.mealType})
   • Started: ${p.startDate} | Rate: ${currency}${p.rate}/plate (${p.persons}p = ${currency}${p.dailyCost}/day)
   • Paid: ${currency}${p.amountPaid.toLocaleString()} (${p.totalDays} days)
   • Delivered: ${p.daysDelivered} days (${currency}${p.spent.toLocaleString()}) | Skips: ${p.daysSkipped} days
   • Balance: *${currency}${p.remainingBalance.toLocaleString()} left* (${p.remainingDays} days remaining${p.extendedEndDate ? `, valid till ${p.extendedEndDate}` : ''})`
      )
      .join('\n\n');
  } else {
    plansText = `• Plan: ${data.packageTitle} (${data.totalDays} days)`;
  }

  // Format daily ledger grouped by date
  const dateMap: Record<string, StatementLedgerRow[]> = {};
  for (const r of data.rows) {
    if (!dateMap[r.dateStr]) dateMap[r.dateStr] = [];
    dateMap[r.dateStr].push(r);
  }

  const ledgerLines: string[] = [];
  const sortedDates = Object.keys(dateMap).sort();

  for (const d of sortedDates) {
    const dayRows = dateMap[d];
    const sample = dayRows[0];
    const parts: string[] = [];
    let dayTotalDebit = 0;
    let latestBalance = sample.runningBalance ?? 0;

    for (const r of dayRows) {
      dayTotalDebit += r.debit;
      if (r.runningBalance !== undefined) latestBalance = r.runningBalance;

      if (r.status === 'COOK OFF') {
        const comment = r.notes ? ` [${r.notes}]` : '';
        parts.push(`🏖️ *Cook Off*${comment} (Carried over)`);
      } else if (r.status === 'DELIVERED' || r.status === 'EXTRA') {
        const dishPart = r.dish && !r.dish.includes('Standard') ? ` (${r.dish})` : '';
        const notePart = r.notes && !r.notes.startsWith('Auto-delivered') ? ` [${r.notes}]` : '';
        const sessionEmoji = r.session === 'Breakfast' ? '🍳' : '🍱';
        parts.push(`${sessionEmoji} ${r.session}: Delivered ${r.persons}p (${currency}${r.debit})${dishPart}${notePart}`);
      } else if (r.status === 'SKIPPED') {
        const notePart = r.notes ? ` [${r.notes}]` : ' [Carried over]';
        const sessionEmoji = r.session === 'Breakfast' ? '🍳' : '🍱';
        parts.push(`${sessionEmoji} ⏸ ${r.session} Skipped${notePart}`);
      }
    }

    const dayText = `• *${sample.dateFormatted}:* ${parts.join(' | ')} | Debit: ${currency}${dayTotalDebit} | Bal: *${currency}${latestBalance.toLocaleString()}*`;
    ledgerLines.push(dayText);
  }

  return `🍽️ *TIFFINFLOW FOOD & SUBSCRIPTION ACCOUNT STATEMENT*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *Statement Ref:* ${data.statementId}
📅 *Statement Period:* ${data.startDate} to ${data.endDate}
🏷️ *Period Label:* ${data.periodLabel}
👨‍🍳 *Caterer:* ${data.catererName} (${data.catererPhone})
👤 *Subscriber:* ${data.subscriberName}
⏰ *Generated:* ${data.generatedAt}

📋 *COLLATED ACTIVE PLANS:*
${plansText}

💰 *FINANCIAL CONSOLIDATION:*
• Total Deposited: ${currency}${data.totalBudget.toLocaleString()}
• Total Consumed / Debited: ${currency}${data.totalSpent.toLocaleString()} (🍳 ${data.breakfastDelivered} Breakfast + 🍱 ${data.lunchDelivered} Lunch)
• Carry-over Credit Saved: ${currency}${data.totalCarriedOverValue.toLocaleString()} (${data.carryOverDaysSaved} days preserved)
• Net Remaining Balance: *${currency}${data.netRemainingBalance.toLocaleString()}*

━━━━━━━━━━━━━━━━━━━━━━━━━━
📑 *ITEMIZED DAILY MEAL LEDGER & COMMENTS:*
${ledgerLines.length > 0 ? ledgerLines.join('\n') : 'No recorded meals in this period.'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *Official verified record generated via TiffinFlow*`;
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

  let y = 35;

  // 2. BANK ACCOUNT & PARTY METADATA GRID (Two Columns)
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  // Column 1: Caterer / Service Provider
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SERVICE PROVIDER / CATERER', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.catererName, margin + 4, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact: ${data.catererPhone}`, margin + 4, y + 16);

  // Column 2: Statement Period & Plan Scope
  const midX = margin + (pageWidth - margin * 2) / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('STATEMENT PERIOD & SCOPE', midX, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`From: ${data.startDate}   To: ${data.endDate}`, midX, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Period: ${data.periodLabel}`, midX, y + 16);

  y += 25;

  // 3. COLLATED ACTIVE SUBSCRIPTIONS BOX (If multiple or single plans)
  if (data.collatedPlans && data.collatedPlans.length > 0) {
    const boxHeight = 8 + data.collatedPlans.length * 6.5;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('COLLATED SUBSCRIPTION PLANS ACTIVE IN THIS PERIOD', margin + 4, y + 5);

    data.collatedPlans.forEach((plan, i) => {
      const py = y + 9.5 + i * 6.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${plan.title}:`, margin + 4, py);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `Start: ${plan.startDate} | Rate: ${data.currency}${plan.rate}/p (${plan.persons}p = ${data.currency}${plan.dailyCost}/day) | Paid: ${data.currency}${plan.amountPaid} | Delivered: ${plan.daysDelivered}d (${data.currency}${plan.spent}) | Left: ${data.currency}${plan.remainingBalance} (${plan.remainingDays}d)`,
        margin + 44,
        py
      );
    });

    y += boxHeight + 4;
  }

  // 4. EXECUTIVE FINANCIAL SUMMARY CARDS
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 20;

  // Card 1: Consumed Value
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL DEBITED', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.currency}${data.totalSpent.toLocaleString()}`, margin + 3, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.effectiveDaysConsumed} days consumed`, margin + 3, y + 16);

  // Card 2: Meals Delivered
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(c2X, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text('MEALS SERVED', c2X + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(6, 95, 70);
  doc.text(`🍳 ${data.breakfastDelivered} | 🍱 ${data.lunchDelivered}`, c2X + 3, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`${data.breakfastDelivered + data.lunchDelivered} total plates`, c2X + 3, y + 16);

  // Card 3: Carried-over Credit
  const c3X = c2X + cardWidth + 3;
  doc.setFillColor(254, 243, 199); // amber-50
  doc.roundedRect(c3X, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text('CARRY-OVER CREDIT', c3X + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(146, 64, 14);
  doc.text(`${data.currency}${data.totalCarriedOverValue.toLocaleString()}`, c3X + 3, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`+${data.carryOverDaysSaved} Days Saved`, c3X + 3, y + 16);

  // Card 4: Remaining Plan Balance
  const c4X = c3X + cardWidth + 3;
  doc.setFillColor(240, 249, 255); // sky-50
  doc.roundedRect(c4X, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(3, 105, 161);
  doc.text('NET REMAINING BALANCE', c4X + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(12, 74, 110);
  doc.text(`${data.currency}${data.netRemainingBalance.toLocaleString()}`, c4X + 3, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(3, 105, 161);
  doc.text(`${data.remainingDays} days remaining`, c4X + 3, y + 16);

  y += cardHeight + 6;

  // 5. ITEMIZED DAILY TRANSACTION TABLE (AutoTable)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('ITEMIZED DAILY MEAL LEDGER & COMMENTS (Bank Statement Format)', margin, y);

  y += 3;

  const tableData = data.rows.map((row) => {
    const sessionLabel = `${row.session}${row.planName ? `\n(${row.planName})` : ''}`;
    
    // Dish & Notes/Comments (explicitly printing comments!)
    let descriptionText = row.dish;
    if (row.notes && !row.notes.startsWith('Auto-delivered') && row.notes !== row.dish) {
      descriptionText += `\nComment: ${row.notes}`;
    }

    const statusText =
      row.status === 'DELIVERED'
        ? `Delivered (${row.persons}p)`
        : row.status === 'SKIPPED'
        ? 'Skipped (Credit)'
        : row.status === 'COOK OFF'
        ? 'Cook Holiday'
        : `Extra (${row.persons}p)`;

    const debitText = row.debit > 0 ? `${data.currency}${row.debit.toLocaleString()}` : '₹0';
    const balanceText = row.runningBalance !== undefined ? `${data.currency}${row.runningBalance.toLocaleString()}` : '-';

    return [
      row.dateFormatted,
      sessionLabel,
      descriptionText,
      statusText,
      debitText,
      balanceText,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 18 },
    head: [[
      'Date & Day',
      'Meal & Plan',
      'Food, Dish & Comments',
      'Delivery Status',
      'Debit',
      'Balance'
    ]],
    body: tableData.length > 0 ? tableData : [[
      '-',
      '-',
      'No recorded transactions in this period',
      '-',
      '₹0',
      '₹0'
    ]],
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 64 },
      3: { cellWidth: 28, fontStyle: 'bold' },
      4: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      // Color-code delivery status
      if (hookData.section === 'body' && hookData.column.index === 3) {
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
      // Highlight debits
      if (hookData.section === 'body' && hookData.column.index === 4) {
        const text = String(hookData.cell.raw);
        if (text !== '₹0' && text !== '0') {
          hookData.cell.styles.textColor = [15, 23, 42];
        } else {
          hookData.cell.styles.textColor = [148, 163, 184];
        }
      }
      // Highlight running balance in emerald
      if (hookData.section === 'body' && hookData.column.index === 5) {
        hookData.cell.styles.textColor = [5, 150, 105];
      }
    },
    didDrawPage: (hookData) => {
      // Formal statement footer
      const currentDoc = hookData.doc;
      const str = `Page ${hookData.pageNumber} · TiffinFlow Official Meal Subscription Ledger · Statement Ref: ${data.statementId}`;
      currentDoc.setFontSize(7);
      currentDoc.setTextColor(148, 163, 184);
      currentDoc.text(str, pageWidth / 2, pageHeight - 8, { align: 'center' });

      currentDoc.setFillColor(16, 185, 129);
      currentDoc.rect(margin, pageHeight - 5, pageWidth - margin * 2, 0.8, 'F');
    },
  });

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
 * Share statement directly to WhatsApp with companion full statement text & downloadable PDF
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

  const companionMessage = generateFullBankStatementText(data);
  const encoded = encodeURIComponent(companionMessage);
  const waUrl = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

  // Native share if supported
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
    }
  }

  // Fallback: download PDF and open WhatsApp web with statement text
  downloadStatementPdf(data);
  window.open(waUrl, '_blank');

  return { method: 'download_and_whatsapp', success: true };
}

/**
 * Export Statement Ledger as CSV for Excel / Google Sheets
 */
export function exportStatementCsv(data: StatementSummaryData): void {
  const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

  const headers = [
    'Date & Day',
    'Meal Session',
    'Plan Name',
    'Dish / Food Item',
    'Comments & Reason',
    'Delivery Status',
    'Portions (Persons)',
    'Rate',
    'Debit Amount (Spent)',
    'Running Balance',
    'Carry-Over Effect',
  ];

  const metaRows = [
    ['STATEMENT TITLE', 'TIFFINFLOW MEAL SUBSCRIPTION ACCOUNT STATEMENT'],
    ['STATEMENT ID', data.statementId],
    ['STATEMENT PERIOD', `From: ${data.startDate} To: ${data.endDate}`],
    ['PERIOD LABEL', data.periodLabel],
    ['CATERER', `${data.catererName} (${data.catererPhone})`],
    ['SUBSCRIBER', data.subscriberName],
    ['TOTAL BUDGET DEPOSITED', `${data.currency}${data.totalBudget}`],
    ['TOTAL VALUE CONSUMED', `${data.currency}${data.totalSpent}`],
    ['NET REMAINING BALANCE', `${data.currency}${data.netRemainingBalance}`],
    ['CARRIED OVER VALUE SAVED', `${data.currency}${data.totalCarriedOverValue}`],
    ['TOTAL DAYS', `${data.totalDays}`],
    ['CONSUMED DAYS', `${data.effectiveDaysConsumed}`],
    ['REMAINING DAYS', `${data.remainingDays}`],
    ['GENERATED AT', data.generatedAt],
    [],
  ];

  const csvRows: string[][] = [
    ...metaRows,
    headers,
    ...data.rows.map((r) => [
      r.dateFormatted,
      r.session,
      r.planName || '',
      r.dish,
      r.notes || '',
      r.status,
      String(r.persons),
      `${r.rate}`,
      `${r.debit}`,
      r.runningBalance !== undefined ? `${r.runningBalance}` : '',
      r.carryOverEffect,
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
