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
  const startDate = new Date();
  startDate.setDate(today.getDate() - 12); // started 12 days ago

  const y = startDate.getFullYear();
  const m = String(startDate.getMonth() + 1).padStart(2, '0');
  const d = String(startDate.getDate()).padStart(2, '0');
  const startStr = `${y}-${m}-${d}`;

  const defaultPkg: PackagePlan = {
    id: 'pkg_active_1',
    title: 'Monthly Breakfast & Lunch Plan',
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
    notes: 'Pure vegetarian home-style meals',
  };

  const records: Record<string, DayRecord> = {};

  for (let i = 0; i <= 12; i++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + i);
    const dateStr = curDate.toISOString().split('T')[0];

    // Simulate 2 skipped days (carried over!) and 1 cook off
    if (i === 4) {
      // Cook took leave
      records[dateStr] = {
        date: dateStr,
        breakfast: { status: 'skipped', persons: 1, rate: 60, notes: 'Cook holiday (Carried over)' },
        lunch: { status: 'skipped', persons: 1, rate: 90, notes: 'Cook holiday (Carried over)' },
        isCookOff: true,
        notes: 'Cook out of station',
      };
    } else if (i === 8) {
      // Office lunch event, breakfast taken, lunch skipped
      records[dateStr] = {
        date: dateStr,
        breakfast: { status: 'delivered', persons: 1, rate: 60 },
        lunch: { status: 'skipped', persons: 1, rate: 90, notes: 'Office team lunch (Carried over)' },
        isCookOff: false,
      };
    } else if (i === 11) {
      // Guest visited! Extra portion taken
      records[dateStr] = {
        date: dateStr,
        breakfast: { status: 'delivered', persons: 2, rate: 60, notes: 'Guest breakfast' },
        lunch: { status: 'delivered', persons: 2, rate: 90, notes: 'Guest lunch' },
        isCookOff: false,
      };
    } else {
      // Normal delivery
      records[dateStr] = {
        date: dateStr,
        breakfast: { status: 'delivered', persons: 1, rate: 60 },
        lunch: { status: 'delivered', persons: 1, rate: 90 },
        isCookOff: false,
      };
    }
  }

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
