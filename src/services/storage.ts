import { DayRecord, PackagePlan, RateConfig } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const STORAGE_KEYS = {
  CONFIG: 'tiffinflow_config',
  PACKAGE: 'tiffinflow_package',
  RECORDS: 'tiffinflow_records',
};

export const DEFAULT_CONFIG: RateConfig = {
  currency: '₹',
  defaultBreakfastRate: 60,
  defaultLunchRate: 90,
  defaultPersons: 1,
  catererName: 'Ramesh Cook (Tiffin)',
  catererPhone: '+91 98765 43210',
};

/**
 * Generate starter sample data for instant wow factor
 */
export function generateSampleData() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const startStr = `${y}-${m}-${d}`;

  const defaultPkg: PackagePlan = {
    id: 'pkg_active_1',
    title: 'My Meal Subscription',
    startDate: startStr,
    totalDays: 30,
    activeDaysOfWeek: [1, 2, 3, 4, 5, 6], // Mon - Sat (Skip Sunday)
    includesBreakfast: true,
    includesLunch: true,
    breakfastRate: 60,
    lunchRate: 90,
    defaultPersons: 1,
    totalAmountPaid: 4500,
    status: 'active',
  };

  const records: Record<string, DayRecord> = {};
  return { defaultPkg, records };
}

// LocalStorage helpers
export function loadLocalConfig(): RateConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return raw ? JSON.parse(raw) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveLocalConfig(config: RateConfig): void {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function loadLocalPackage(): PackagePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PACKAGE);
    if (!raw) {
      const sample = generateSampleData();
      saveLocalPackage(sample.defaultPkg);
      saveLocalRecords(sample.records);
      return sample.defaultPkg;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalPackage(pkg: PackagePlan | null): void {
  if (pkg) {
    localStorage.setItem(STORAGE_KEYS.PACKAGE, JSON.stringify(pkg));
  } else {
    localStorage.removeItem(STORAGE_KEYS.PACKAGE);
  }
}

export function loadLocalRecords(): Record<string, DayRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!raw) {
      const sample = generateSampleData();
      saveLocalRecords(sample.records);
      return sample.records;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLocalRecords(records: Record<string, DayRecord>): void {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
}

// Firestore Sync functions (when user logged in)
export async function syncUserDataFromCloud(userId: string): Promise<{
  config?: RateConfig;
  pkg?: PackagePlan | null;
  records?: Record<string, DayRecord>;
} | null> {
  if (!db) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as any;
    }
    return null;
  } catch (err) {
    console.error('Error fetching Firestore user data:', err);
    return null;
  }
}

export async function syncUserDataToCloud(
  userId: string,
  config: RateConfig,
  pkg: PackagePlan | null,
  records: Record<string, DayRecord>
): Promise<void> {
  if (!db) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      config,
      pkg,
      records,
      lastSyncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error syncing Firestore user data:', err);
  }
}
