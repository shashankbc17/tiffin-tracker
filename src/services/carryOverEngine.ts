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

  for (const dateStr of recordDates) {
    if (dateStr < pkg.startDate) continue;

    const day = records[dateStr];
    const isScheduledActive = isDayActiveInPackage(dateStr, activeDaysOfWeek);

    // Breakfast calculation
    if (pkg.includesBreakfast && day.breakfast) {
      if (day.breakfast.status === 'delivered' || day.breakfast.status === 'extra') {
        bDelivered += day.breakfast.persons || 1;
        const rate = day.breakfast.rate || pkg.breakfastRate || config.defaultBreakfastRate;
        totalSpent += rate * (day.breakfast.persons || 1);
      } else if (day.breakfast.status === 'skipped') {
        bSkipped += day.breakfast.persons || 1;
        const rate = day.breakfast.rate || pkg.breakfastRate || config.defaultBreakfastRate;
        carriedOverValue += rate * (day.breakfast.persons || 1);
      }
    }

    // Lunch calculation
    if (pkg.includesLunch && day.lunch) {
      if (day.lunch.status === 'delivered' || day.lunch.status === 'extra') {
        lDelivered += day.lunch.persons || 1;
        const rate = day.lunch.rate || pkg.lunchRate || config.defaultLunchRate;
        totalSpent += rate * (day.lunch.persons || 1);
      } else if (day.lunch.status === 'skipped') {
        lSkipped += day.lunch.persons || 1;
        const rate = day.lunch.rate || pkg.lunchRate || config.defaultLunchRate;
        carriedOverValue += rate * (day.lunch.persons || 1);
      }
    }

    // Only active scheduled days count as skips towards carry-over
    if (isScheduledActive) {
      const bIsSkipped = !pkg.includesBreakfast || day.breakfast?.status === 'skipped';
      const lIsSkipped = !pkg.includesLunch || day.lunch?.status === 'skipped';
      if (day.isCookOff || (bIsSkipped && lIsSkipped)) {
        fullDaysSkipped++;
      }
    }
  }

  // Effective days consumed based on max delivered portions
  const avgPersons = pkg.defaultPersons || 1;
  const bDays = Math.ceil(bDelivered / avgPersons);
  const lDays = Math.ceil(lDelivered / avgPersons);
  const effectiveDaysConsumed = Math.max(bDays, lDays);

  const carryOverDays = fullDaysSkipped;
  const remainingDays = Math.max(0, pkg.totalDays - effectiveDaysConsumed);

  // Extended end date pushes out by carryOverDays across active days of the week
  const extendedEndDate = addActiveDays(pkg.startDate, pkg.totalDays + carryOverDays, activeDaysOfWeek);

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
