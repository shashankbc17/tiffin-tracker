import { DayRecord, PackagePlan, CarryOverStats, RateConfig } from '../types';

/**
 * Format a Date object into 'YYYY-MM-DD'
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current date & time information strictly in Indian Standard Time (IST - Asia/Kolkata)
 */
export function getIstNow(): {
  dateStr: string;
  formattedDate: string;
  dayOfWeek: number;
  hour: number;
  minute: number;
} {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(now);

  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  const [y, m, d] = dateStr.split('-').map(Number);
  const istDateObj = new Date(y, m - 1, d);
  const dayOfWeek = istDateObj.getDay();

  return { dateStr, formattedDate, dayOfWeek, hour, minute };
}

/**
 * Check if a date string falls on an active delivery day of the week
 * 0 = Sunday, 1 = Monday, ... 6 = Saturday
 */
export function isDayActiveInPackage(dateStr: string, activeDaysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6]): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay();
  return activeDaysOfWeek.includes(dayOfWeek);
}

/**
 * Check if a specific meal (breakfast or lunch) is active on a given date for a package
 */
export function isMealActiveOnDate(
  dateStr: string,
  pkg: PackagePlan,
  meal: 'breakfast' | 'lunch'
): boolean {
  if (meal === 'breakfast') {
    if (!pkg.includesBreakfast) return false;
    const days = pkg.breakfastDaysOfWeek && pkg.breakfastDaysOfWeek.length > 0
      ? pkg.breakfastDaysOfWeek
      : pkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6];
    return isDayActiveInPackage(dateStr, days);
  } else {
    if (!pkg.includesLunch) return false;
    const days = pkg.lunchDaysOfWeek && pkg.lunchDaysOfWeek.length > 0
      ? pkg.lunchDaysOfWeek
      : pkg.activeDaysOfWeek || [1, 2, 3, 4, 5, 6];
    return isDayActiveInPackage(dateStr, days);
  }
}

/**
 * Add N calendar days to a 'YYYY-MM-DD' date string
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Advance from a start date across N active delivery days of the week
 */
export function addActiveDays(
  startDateStr: string,
  targetActiveDays: number,
  activeDaysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6]
): string {
  if (targetActiveDays <= 1) return startDateStr;
  const [y, m, d] = startDateStr.split('-').map(Number);
  const cur = new Date(y, m - 1, d);
  let activeCount = activeDaysOfWeek.includes(cur.getDay()) ? 1 : 0;

  while (activeCount < targetActiveDays) {
    cur.setDate(cur.getDate() + 1);
    if (activeDaysOfWeek.includes(cur.getDay())) {
      activeCount++;
    }
  }

  return formatDate(cur);
}

/**
 * Check if the cutoff time has passed for a package on today's date,
 * meaning that if the package started today with no meals logged yet,
 * it must wait until the next active delivery day.
 */
export function isTodayCutoffPassedForPackage(
  pkg: PackagePlan | null,
  config?: RateConfig,
  records?: Record<string, DayRecord>,
  customHour?: number
): boolean {
  if (!pkg) return false;
  const { dateStr: todayStr, hour: defaultHour } = getIstNow();
  const currentHour = customHour ?? defaultHour;

  // Only applies if the package's startDate is today
  if (pkg.startDate !== todayStr) return false;

  // If user already logged something on today, then today was actively used
  if (records && records[todayStr]) {
    const r = records[todayStr];
    const hasDelivery =
      (r.breakfast?.status && r.breakfast.status !== 'none') ||
      (r.lunch?.status && r.lunch.status !== 'none') ||
      r.isCookOff;
    if (hasDelivery) return false;
  }

  const breakfastCutoff = config?.breakfastCutoffHour ?? 11;
  const lunchCutoff = config?.lunchCutoffHour ?? 15;

  const isBActive = isMealActiveOnDate(todayStr, pkg, 'breakfast');
  const isLActive = isMealActiveOnDate(todayStr, pkg, 'lunch');

  // If neither meal is scheduled for today (e.g. weekend off day)
  if (!isBActive && !isLActive) return false;

  // Breakfast-only plan
  if (pkg.includesBreakfast && !pkg.includesLunch) {
    return isBActive && currentHour >= breakfastCutoff;
  }

  // Lunch-only plan
  if (!pkg.includesBreakfast && pkg.includesLunch) {
    return isLActive && currentHour >= lunchCutoff;
  }

  // Both meals: If breakfast cutoff has passed, waiting until next day ensures a clean full-day start
  if (pkg.includesBreakfast && pkg.includesLunch) {
    if (isBActive && currentHour >= breakfastCutoff) return true;
    if (isLActive && currentHour >= lunchCutoff) return true;
  }

  return false;
}

/**
 * Get the next valid active start date for a package if today's cutoff has already passed.
 */
export function getAdjustedStartDateIfCutoffPassed(
  pkg: PackagePlan,
  config?: RateConfig,
  records?: Record<string, DayRecord>,
  customHour?: number
): string {
  const { dateStr: todayStr } = getIstNow();
  if (pkg.startDate > todayStr) {
    return pkg.startDate; // Already starts in future
  }

  if (!isTodayCutoffPassedForPackage(pkg, config, records, customHour)) {
    return pkg.startDate;
  }

  // Cutoff has passed! Advance to next day (or next active day in package schedule)
  let nextDate = addDays(todayStr, 1);
  const activeDays =
    pkg.activeDaysOfWeek && pkg.activeDaysOfWeek.length > 0
      ? pkg.activeDaysOfWeek
      : [0, 1, 2, 3, 4, 5, 6];

  while (!isDayActiveInPackage(nextDate, activeDays)) {
    nextDate = addDays(nextDate, 1);
  }

  return nextDate;
}

/**
 * Calculate full carry-over analytics for an active package
 */
export function calculateCarryOver(
  pkg: PackagePlan | null,
  records: Record<string, DayRecord>,
  config: RateConfig
): CarryOverStats {
  if (!pkg) {
    return {
      totalPackageDays: 0,
      breakfastDelivered: 0,
      breakfastSkipped: 0,
      lunchDelivered: 0,
      lunchSkipped: 0,
      effectiveDaysConsumed: 0,
      carryOverDays: 0,
      remainingDays: 0,
      originalEndDate: formatDate(new Date()),
      extendedEndDate: formatDate(new Date()),
      totalSpent: 0,
      carriedOverValue: 0,
    };
  }

  const activeDaysOfWeek = pkg.activeDaysOfWeek && pkg.activeDaysOfWeek.length > 0 
    ? pkg.activeDaysOfWeek 
    : [1, 2, 3, 4, 5, 6]; // default Mon-Sat

  // Project original end date based on active days of week
  const originalEndDate = addActiveDays(pkg.startDate, pkg.totalDays, activeDaysOfWeek);

  let bDelivered = 0;
  let bSkipped = 0;
  let lDelivered = 0;
  let lSkipped = 0;
  let totalSpent = 0;
  let carriedOverValue = 0;

  const recordDates = Object.keys(records).sort();
  const planPersons = pkg.defaultPersons || 1;
  const { dateStr: todayStr } = getIstNow();

  for (const dateStr of recordDates) {
    if (dateStr < pkg.startDate) continue;

    const day = records[dateStr];
    const isFuture = dateStr > todayStr;
    const isBreakfastActive = isMealActiveOnDate(dateStr, pkg, 'breakfast');
    const isLunchActive = isMealActiveOnDate(dateStr, pkg, 'lunch');

    // Cook holiday check
    if (day.isCookOff) {
      if (isBreakfastActive) {
        bSkipped += planPersons;
        const bRate = day.breakfast?.rate || pkg.breakfastRate || config.defaultBreakfastRate;
        carriedOverValue += bRate * planPersons;
      }
      if (isLunchActive) {
        lSkipped += planPersons;
        const lRate = day.lunch?.rate || pkg.lunchRate || config.defaultLunchRate;
        carriedOverValue += lRate * planPersons;
      }
      continue;
    }

    // Breakfast calculation
    if (pkg.includesBreakfast && day.breakfast) {
      const bRate = day.breakfast.rate || pkg.breakfastRate || config.defaultBreakfastRate;
      // Future dates must not count as delivered
      if (!isFuture && (day.breakfast.status === 'delivered' || day.breakfast.status === 'extra')) {
        const deliveredCount = day.breakfast.persons || planPersons;
        bDelivered += deliveredCount;
        totalSpent += bRate * deliveredCount;

        // Partial delivery carryover: If fewer persons were delivered on a scheduled day
        if (day.breakfast.status === 'delivered' && deliveredCount < planPersons && isBreakfastActive) {
          const missedPersons = planPersons - deliveredCount;
          bSkipped += missedPersons;
          carriedOverValue += bRate * missedPersons;
        }
      } else if (day.breakfast.status === 'skipped' && isBreakfastActive) {
        const skippedCount = day.breakfast.persons || planPersons;
        bSkipped += skippedCount;
        carriedOverValue += bRate * skippedCount;
      }
    }

    // Lunch calculation
    if (pkg.includesLunch && day.lunch) {
      const lRate = day.lunch.rate || pkg.lunchRate || config.defaultLunchRate;
      // Future dates must not count as delivered
      if (!isFuture && (day.lunch.status === 'delivered' || day.lunch.status === 'extra')) {
        const deliveredCount = day.lunch.persons || planPersons;
        lDelivered += deliveredCount;
        totalSpent += lRate * deliveredCount;

        // Partial delivery carryover: If fewer persons were delivered on a scheduled day
        if (day.lunch.status === 'delivered' && deliveredCount < planPersons && isLunchActive) {
          const missedPersons = planPersons - deliveredCount;
          lSkipped += missedPersons;
          carriedOverValue += lRate * missedPersons;
        }
      } else if (day.lunch.status === 'skipped' && isLunchActive) {
        const skippedCount = day.lunch.persons || planPersons;
        lSkipped += skippedCount;
        carriedOverValue += lRate * skippedCount;
      }
    }
  }

  // Daily expected portions across active meal types in the plan
  const activeMealCount = (pkg.includesBreakfast ? 1 : 0) + (pkg.includesLunch ? 1 : 0);
  const dailyTotalPortions = Math.max(1, activeMealCount * planPersons);

  const totalSkippedPortions = (pkg.includesBreakfast ? bSkipped : 0) + (pkg.includesLunch ? lSkipped : 0);
  const totalDeliveredPortions = (pkg.includesBreakfast ? bDelivered : 0) + (pkg.includesLunch ? lDelivered : 0);

  // Carry-over days (supports fractional person portions e.g. 0.5 days)
  const carryOverDays = Math.round((totalSkippedPortions / dailyTotalPortions) * 10) / 10;
  
  // Effective days consumed (supports fractional days)
  const effectiveDaysConsumed = Math.round((totalDeliveredPortions / dailyTotalPortions) * 10) / 10;
  const remainingDays = Math.max(0, Math.round((pkg.totalDays - effectiveDaysConsumed) * 10) / 10);

  // Extended end date pushes out by Math.ceil(carryOverDays) across active days of the week
  const daysToExtend = Math.ceil(carryOverDays);
  const extendedEndDate = addActiveDays(pkg.startDate, pkg.totalDays + daysToExtend, activeDaysOfWeek);

  return {
    totalPackageDays: pkg.totalDays,
    breakfastDelivered: bDelivered,
    breakfastSkipped: bSkipped,
    lunchDelivered: lDelivered,
    lunchSkipped: lSkipped,
    effectiveDaysConsumed,
    carryOverDays,
    remainingDays,
    originalEndDate,
    extendedEndDate,
    totalSpent,
    carriedOverValue,
  };
}

/**
 * Generate a clean WhatsApp-ready billing & carryover statement
 */
export function generateWhatsAppSummary(
  monthName: string,
  pkg: PackagePlan | null,
  stats: CarryOverStats,
  config: RateConfig
): string {
  const currency = config.currency || '₹';
  const caterer = config.catererName || 'Bhaiya / Caterer';
  
  const daysMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
  const scheduleText = pkg?.activeDaysOfWeek 
    ? (pkg.activeDaysOfWeek.length === 7 ? 'All 7 Days' : 
       pkg.activeDaysOfWeek.length === 5 && !pkg.activeDaysOfWeek.includes(0) && !pkg.activeDaysOfWeek.includes(6) ? 'Mon - Fri' :
       pkg.activeDaysOfWeek.map(d => daysMap[d]).join(', '))
    : 'Mon - Sat';

  const incBf = pkg ? pkg.includesBreakfast !== false : true;
  const incLn = pkg ? pkg.includesLunch !== false : true;

  const mealRecordLines: string[] = [];
  if (incBf) {
    mealRecordLines.push(`• 🍳 Breakfast Served: ${stats.breakfastDelivered} | Skipped: ${stats.breakfastSkipped}`);
  }
  if (incLn) {
    mealRecordLines.push(`• 🍱 Lunch Served: ${stats.lunchDelivered} | Skipped: ${stats.lunchSkipped}`);
  }
  mealRecordLines.push(`• 🔁 *Carry-over Days Saved:* *${stats.carryOverDays} days*`);
  mealRecordLines.push(`• ⏳ *Remaining Days in Plan:* *${stats.remainingDays} days*`);

  return `🍽️ *Tiffin & Meal Statement - ${monthName}*
Hi ${caterer}, here is the updated summary for our meal subscription:

📦 *Package Info:*
• Total Plan: ${stats.totalPackageDays} Days (${scheduleText})
• Meals: ${pkg?.includesBreakfast ? 'Breakfast ' : ''}${pkg?.includesLunch ? (pkg.includesBreakfast ? '+ Lunch' : 'Lunch') : ''}
• Start Date: ${pkg?.startDate || 'N/A'}
• Original End Date: ${stats.originalEndDate}
• ⏭️ *Extended End Date (Carry-over):* *${stats.extendedEndDate}*

📊 *Meals Record:*
${mealRecordLines.join('\n')}

💰 *Financials:*
• Total Consumed Value: ${currency}${stats.totalSpent.toLocaleString()}
• Carry-over Credit Saved: ${currency}${stats.carriedOverValue.toLocaleString()}

_Generated via TiffinFlow App_`;
}

/**
 * Automatically marks scheduled meals as delivered once cutoff timing has passed:
 * - Breakfast delivery window cutoff: 11:00 AM IST (or config.breakfastCutoffHour)
 * - Lunch delivery window cutoff: 3:00 PM IST (15:00) (or config.lunchCutoffHour)
 * Works seamlessly on webhosted static sites (GitHub Pages) on app open & periodic interval.
 */
export function runAutoDeliveryCheck(
  packages: PackagePlan[],
  records: Record<string, DayRecord>,
  config: RateConfig
): { updatedRecords: Record<string, DayRecord>; hasChanges: boolean } {
  if (!config.autoDeliveryEnabled) {
    return { updatedRecords: records, hasChanges: false };
  }

  const activePackages = packages.filter((p) => p.status === 'active');
  if (activePackages.length === 0) {
    return { updatedRecords: records, hasChanges: false };
  }

  const { dateStr: todayStr, hour: istHour } = getIstNow();
  const breakfastCutoff = config.breakfastCutoffHour ?? 11; // 11:00 AM IST
  const lunchCutoff = config.lunchCutoffHour ?? 15; // 3:00 PM IST (15:00)

  let hasChanges = false;
  const updatedRecords = { ...records };

  // Automated delivery ONLY evaluates today's window once passed, NEVER retroactively mutates past history!
  const cur = todayStr;
  const existing = updatedRecords[cur];
  if (existing?.isCookOff) {
    return { updatedRecords: records, hasChanges: false };
  }

  const isPastBreakfastCutoff = istHour >= breakfastCutoff;
  const isPastLunchCutoff = istHour >= lunchCutoff;

  let dayModified = false;
  let bEntry = existing?.breakfast ? { ...existing.breakfast } : null;
  let lEntry = existing?.lunch ? { ...existing.lunch } : null;

  for (const pkg of activePackages) {
    if (cur < pkg.startDate) continue;

    // Breakfast auto-delivery
    if (pkg.includesBreakfast && isMealActiveOnDate(cur, pkg, 'breakfast')) {
      const currentBStatus = bEntry?.status || 'none';
      if (currentBStatus === 'none' && isPastBreakfastCutoff) {
        const planPersons = pkg.defaultPersons || config.defaultPersons || 1;
        const rate = pkg.breakfastRate || config.defaultBreakfastRate || 60;
        bEntry = {
          status: 'delivered',
          persons: bEntry?.persons && bEntry.persons > 0 ? bEntry.persons : planPersons,
          rate: bEntry?.rate && bEntry.rate > 0 ? bEntry.rate : rate,
          notes: bEntry?.notes || 'Auto-marked delivered',
          menuItem: bEntry?.menuItem,
          autoDelivered: true,
        };
        dayModified = true;
      }
    }

    // Lunch auto-delivery
    if (pkg.includesLunch && isMealActiveOnDate(cur, pkg, 'lunch')) {
      const currentLStatus = lEntry?.status || 'none';
      if (currentLStatus === 'none' && isPastLunchCutoff) {
        const planPersons = pkg.defaultPersons || config.defaultPersons || 1;
        const rate = pkg.lunchRate || config.defaultLunchRate || 90;
        lEntry = {
          status: 'delivered',
          persons: lEntry?.persons && lEntry.persons > 0 ? lEntry.persons : planPersons,
          rate: lEntry?.rate && lEntry.rate > 0 ? lEntry.rate : rate,
          notes: lEntry?.notes || 'Auto-marked delivered',
          menuItem: lEntry?.menuItem,
          autoDelivered: true,
        };
        dayModified = true;
      }
    }
  }

  if (dayModified) {
    const planPersons = config.defaultPersons || 1;
    updatedRecords[cur] = {
      date: cur,
      breakfast: bEntry || {
        status: 'none',
        persons: planPersons,
        rate: config.defaultBreakfastRate || 60,
      },
      lunch: lEntry || {
        status: 'none',
        persons: planPersons,
        rate: config.defaultLunchRate || 90,
      },
      isCookOff: false,
      notes: existing?.notes,
      updatedAt: new Date().toISOString(),
    };
    hasChanges = true;
  }

  return { updatedRecords, hasChanges };
}

export interface MonthOption {
  key: string; // '2026-09'
  label: string; // 'Sep 2026'
  fullLabel: string; // 'September 2026'
  year: number;
  month: number; // 0-11
}

/**
 * Get options for the last N months (default 6) counting back from current IST month
 */
export function getLast6Months(count = 6): MonthOption[] {
  const { dateStr: todayStr } = getIstNow();
  const [y, m] = todayStr.split('-').map(Number);

  const list: MonthOption[] = [];
  for (let i = 0; i < count; i++) {
    // Construct 1st of the target month
    const d = new Date(y, m - 1 - i, 1);
    const targetYear = d.getFullYear();
    const targetMonth = d.getMonth();
    const key = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const fullLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    list.push({ key, label, fullLabel, year: targetYear, month: targetMonth });
  }
  return list;
}

export interface MonthlyReportStats {
  monthKey: string; // '2026-09'
  monthLabel: string; // 'September 2026'
  totalSpent: number;
  carriedOverValue: number;
  breakfastDelivered: number;
  breakfastSkipped: number;
  lunchDelivered: number;
  lunchSkipped: number;
  cookOffDays: number;
  loggedDaysCount: number;
}

/**
 * Calculate comprehensive monthly report stats for a specific 'YYYY-MM'
 */
export function calculateMonthlyStats(
  monthKey: string,
  records: Record<string, DayRecord>,
  pkg: PackagePlan | null,
  config: RateConfig
): MonthlyReportStats {
  const planPersons = pkg?.defaultPersons || config.defaultPersons || 1;
  const defaultBRate = pkg?.breakfastRate || config.defaultBreakfastRate || 60;
  const defaultLRate = pkg?.lunchRate || config.defaultLunchRate || 90;

  let totalSpent = 0;
  let carriedOverValue = 0;
  let breakfastDelivered = 0;
  let breakfastSkipped = 0;
  let lunchDelivered = 0;
  let lunchSkipped = 0;
  let cookOffDays = 0;
  let loggedDaysCount = 0;

  const { dateStr: todayStr } = getIstNow();
  const datesInMonth = Object.keys(records)
    .filter((d) => d.startsWith(monthKey))
    .sort();

  for (const d of datesInMonth) {
    const rec = records[d];
    const isFuture = d > todayStr;
    loggedDaysCount++;

    if (rec.isCookOff) {
      cookOffDays++;
      if (pkg?.includesBreakfast !== false) {
        breakfastSkipped += planPersons;
        carriedOverValue += defaultBRate * planPersons;
      }
      if (pkg?.includesLunch !== false) {
        lunchSkipped += planPersons;
        carriedOverValue += defaultLRate * planPersons;
      }
      continue;
    }

    if (rec.breakfast) {
      const bRate = rec.breakfast.rate || defaultBRate;
      const bCount = rec.breakfast.persons || planPersons;
      if (!isFuture && (rec.breakfast.status === 'delivered' || rec.breakfast.status === 'extra')) {
        breakfastDelivered += bCount;
        totalSpent += bRate * bCount;
      } else if (rec.breakfast.status === 'skipped') {
        breakfastSkipped += bCount;
        carriedOverValue += bRate * bCount;
      }
    }

    if (rec.lunch) {
      const lRate = rec.lunch.rate || defaultLRate;
      const lCount = rec.lunch.persons || planPersons;
      if (!isFuture && (rec.lunch.status === 'delivered' || rec.lunch.status === 'extra')) {
        lunchDelivered += lCount;
        totalSpent += lRate * lCount;
      } else if (rec.lunch.status === 'skipped') {
        lunchSkipped += lCount;
        carriedOverValue += lRate * lCount;
      }
    }
  }

  const [y, m] = monthKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, 1);
  const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    monthKey,
    monthLabel,
    totalSpent,
    carriedOverValue,
    breakfastDelivered,
    breakfastSkipped,
    lunchDelivered,
    lunchSkipped,
    cookOffDays,
    loggedDaysCount,
  };
}

/**
 * Generate monthly WhatsApp statement specifically for a selected month
 */
export function generateMonthlyWhatsAppSummary(
  monthStats: MonthlyReportStats,
  pkg: PackagePlan | null,
  config: RateConfig
): string {
  const currency = config.currency || '₹';
  const caterer = config.catererName || 'Bhaiya / Caterer';
  const incBf = pkg ? pkg.includesBreakfast !== false : true;
  const incLn = pkg ? pkg.includesLunch !== false : true;

  const mealRecordLines: string[] = [];
  if (incBf) {
    mealRecordLines.push(`• 🍳 Breakfast Served: ${monthStats.breakfastDelivered} portion(s) | Skipped: ${monthStats.breakfastSkipped}`);
  }
  if (incLn) {
    mealRecordLines.push(`• 🍱 Lunch Served: ${monthStats.lunchDelivered} portion(s) | Skipped: ${monthStats.lunchSkipped}`);
  }
  mealRecordLines.push(`• 🏖️ Cook Off Days: ${monthStats.cookOffDays} day(s)`);
  mealRecordLines.push(`• 📅 Logged Activity: ${monthStats.loggedDaysCount} day(s)`);

  return `🍽️ *Tiffin & Meal Monthly Report - ${monthStats.monthLabel}*
Hi ${caterer}, here is the monthly report for our meal subscription:

📊 *${monthStats.monthLabel} Meals Record:*
${mealRecordLines.join('\n')}

💰 *Monthly Financials:*
• Total Consumed Value: ${currency}${monthStats.totalSpent.toLocaleString()}
• Carried-over Savings: ${currency}${monthStats.carriedOverValue.toLocaleString()}

_Generated via TiffinFlow App_`;
}

