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
  let fullDaysSkipped = 0;

  const planPersons = pkg.defaultPersons || 1;

  for (const dateStr of recordDates) {
    if (dateStr < pkg.startDate) continue;

    const day = records[dateStr];
    const isScheduledActive = isDayActiveInPackage(dateStr, activeDaysOfWeek);

    // Cook holiday check
    if (day.isCookOff && isScheduledActive) {
      if (pkg.includesBreakfast) {
        bSkipped += planPersons;
        const bRate = day.breakfast?.rate || pkg.breakfastRate || config.defaultBreakfastRate;
        carriedOverValue += bRate * planPersons;
      }
      if (pkg.includesLunch) {
        lSkipped += planPersons;
        const lRate = day.lunch?.rate || pkg.lunchRate || config.defaultLunchRate;
        carriedOverValue += lRate * planPersons;
      }
      continue;
    }

    // Breakfast calculation
    if (pkg.includesBreakfast && day.breakfast) {
      const bRate = day.breakfast.rate || pkg.breakfastRate || config.defaultBreakfastRate;
      if (day.breakfast.status === 'delivered' || day.breakfast.status === 'extra') {
        const deliveredCount = day.breakfast.persons || planPersons;
        bDelivered += deliveredCount;
        totalSpent += bRate * deliveredCount;

        // Partial delivery carryover: If fewer persons were delivered on a scheduled day
        if (day.breakfast.status === 'delivered' && deliveredCount < planPersons && isScheduledActive) {
          const missedPersons = planPersons - deliveredCount;
          bSkipped += missedPersons;
          carriedOverValue += bRate * missedPersons;
        }
      } else if (day.breakfast.status === 'skipped' && isScheduledActive) {
        const skippedCount = day.breakfast.persons || planPersons;
        bSkipped += skippedCount;
        carriedOverValue += bRate * skippedCount;
      }
    }

    // Lunch calculation
    if (pkg.includesLunch && day.lunch) {
      const lRate = day.lunch.rate || pkg.lunchRate || config.defaultLunchRate;
      if (day.lunch.status === 'delivered' || day.lunch.status === 'extra') {
        const deliveredCount = day.lunch.persons || planPersons;
        lDelivered += deliveredCount;
        totalSpent += lRate * deliveredCount;

        // Partial delivery carryover: If fewer persons were delivered on a scheduled day
        if (day.lunch.status === 'delivered' && deliveredCount < planPersons && isScheduledActive) {
          const missedPersons = planPersons - deliveredCount;
          lSkipped += missedPersons;
          carriedOverValue += lRate * missedPersons;
        }
      } else if (day.lunch.status === 'skipped' && isScheduledActive) {
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

  return `🍽️ *Tiffin & Meal Statement - ${monthName}*
Hi ${caterer}, here is the updated summary for our meal subscription:

📦 *Package Info:*
• Total Plan: ${stats.totalPackageDays} Days (${scheduleText})
• Meals: ${pkg?.includesBreakfast ? 'Breakfast ' : ''}${pkg?.includesLunch ? '+ Lunch' : ''}
• Start Date: ${pkg?.startDate || 'N/A'}
• Original End Date: ${stats.originalEndDate}
• ⏭️ *Extended End Date (Carry-over):* *${stats.extendedEndDate}*

📊 *Meals Record:*
• 🍳 Breakfast Served: ${stats.breakfastDelivered} | Skipped: ${stats.breakfastSkipped}
• 🍱 Lunch Served: ${stats.lunchDelivered} | Skipped: ${stats.lunchSkipped}
• 🔁 *Carry-over Days Saved:* *${stats.carryOverDays} days*
• ⏳ *Remaining Days in Plan:* *${stats.remainingDays} days*

💰 *Financials:*
• Total Consumed Value: ${currency}${stats.totalSpent.toLocaleString()}
• Carry-over Credit Saved: ${currency}${stats.carriedOverValue.toLocaleString()}

_Generated via TiffinFlow App_`;
}
