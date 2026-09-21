export type MealStatus = 'delivered' | 'skipped' | 'extra' | 'none';

export type MealType = 'breakfast' | 'lunch';

export interface MealEntry {
  status: MealStatus;
  persons: number;
  rate: number;
  notes?: string;
  menuItem?: string; // e.g. "Idli Vada", "Dal Roti Sabzi"
  autoDelivered?: boolean;
}

export interface DayRecord {
  date: string; // ISO format 'YYYY-MM-DD'
  breakfast: MealEntry;
  lunch: MealEntry;
  isCookOff?: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface PackagePlan {
  id: string;
  title: string;
  startDate: string; // 'YYYY-MM-DD'
  totalDays: number; // e.g. 30 days
  activeDaysOfWeek: number[]; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  breakfastDaysOfWeek?: number[]; // independent breakfast schedule
  lunchDaysOfWeek?: number[]; // independent lunch schedule
  includesBreakfast: boolean;
  includesLunch: boolean;
  breakfastRate: number;
  lunchRate: number;
  defaultPersons: number;
  totalAmountPaid: number;
  status: 'active' | 'completed' | 'paused';
  notes?: string;
}

export interface RateConfig {
  currency: string;
  defaultBreakfastRate: number;
  defaultLunchRate: number;
  defaultPersons: number;
  catererName: string;
  catererPhone: string;
  autoDeliveryEnabled?: boolean;
  breakfastCutoffHour?: number; // e.g. 11 (11:00 AM IST)
  lunchCutoffHour?: number; // e.g. 15 (3:00 PM IST)
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export interface CarryOverStats {
  totalPackageDays: number;
  breakfastDelivered: number;
  breakfastSkipped: number;
  lunchDelivered: number;
  lunchSkipped: number;
  effectiveDaysConsumed: number;
  carryOverDays: number;
  remainingDays: number;
  originalEndDate: string;
  extendedEndDate: string;
  totalSpent: number;
  carriedOverValue: number;
}
