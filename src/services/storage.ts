import { DayRecord, PackagePlan, RateConfig } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

const STORAGE_KEYS = {
  CONFIG: 'tiffinflow_config',
  PACKAGE: 'tiffinflow_package',
  PACKAGES: 'tiffinflow_packages',
  ACTIVE_PKG_ID: 'tiffinflow_active_pkg_id',
  RECORDS: 'tiffinflow_records',
};

export const DEFAULT_CONFIG: RateConfig = {
  currency: '₹',
  defaultBreakfastRate: 60,
  defaultLunchRate: 90,
  defaultPersons: 1,
  catererName: 'Ramesh Cook (Tiffin)',
  catererPhone: '+91 98765 43210',
  autoDeliveryEnabled: true,
  breakfastCutoffHour: 11, // 11:00 AM IST
  lunchCutoffHour: 15, // 3:00 PM IST
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
    breakfastDaysOfWeek: [1, 2, 3, 4, 5, 6],
    lunchDaysOfWeek: [1, 2, 3, 4, 5, 6],
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
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveLocalConfig(config: RateConfig): void {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function loadLocalPackages(): PackagePlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PACKAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Fallback to legacy single package
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.PACKAGE);
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw);
      if (parsedLegacy) {
        saveLocalPackages([parsedLegacy]);
        return [parsedLegacy];
      }
    }
    // Default starter sample
    const sample = generateSampleData();
    saveLocalPackages([sample.defaultPkg]);
    saveLocalRecords(sample.records);
    return [sample.defaultPkg];
  } catch {
    return [];
  }
}

export function saveLocalPackages(packages: PackagePlan[]): void {
  localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
  // Keep legacy single-package key updated for backward compatibility
  const activePkg = packages.find((p) => p.status === 'active') || packages[0] || null;
  if (activePkg) {
    localStorage.setItem(STORAGE_KEYS.PACKAGE, JSON.stringify(activePkg));
  } else {
    localStorage.removeItem(STORAGE_KEYS.PACKAGE);
  }
}

export function loadLocalActivePackageId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_PKG_ID);
}

export function saveLocalActivePackageId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PKG_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PKG_ID);
  }
}

export function loadLocalPackage(): PackagePlan | null {
  const packages = loadLocalPackages();
  const activeId = loadLocalActivePackageId();
  if (activeId) {
    const found = packages.find((p) => p.id === activeId);
    if (found) return found;
  }
  return packages.find((p) => p.status === 'active') || packages[0] || null;
}

export function saveLocalPackage(pkg: PackagePlan | null): void {
  const currentPackages = loadLocalPackages();
  if (!pkg) {
    saveLocalPackages([]);
    return;
  }
  const idx = currentPackages.findIndex((p) => p.id === pkg.id);
  let next: PackagePlan[];
  if (idx >= 0) {
    next = [...currentPackages];
    next[idx] = pkg;
  } else {
    next = [pkg, ...currentPackages];
  }
  saveLocalPackages(next);
  saveLocalActivePackageId(pkg.id);
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
  packages?: PackagePlan[];
  activePackageId?: string | null;
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

/**
 * Real-time bidirectional WebSocket listener for multi-device sync
 * Updates trigger in ~100ms when any signed-in device makes a change!
 */
export function subscribeToCloudUserData(
  userId: string,
  onData: (cloudData: {
    config?: RateConfig;
    pkg?: PackagePlan | null;
    packages?: PackagePlan[];
    activePackageId?: string | null;
    records?: Record<string, DayRecord>;
    lastSyncedAt?: string;
  }) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!db) return () => {};
  try {
    const userDocRef = doc(db, 'users', userId);
    return onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          // If this update was locally generated pending write on THIS device, skip echo
          if (docSnap.metadata.hasPendingWrites) {
            return;
          }
          const data = docSnap.data() as any;
          onData(data);
        }
      },
      (err) => {
        console.warn('Firestore real-time subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error('Failed to setup Firestore real-time listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function syncUserDataToCloud(
  userId: string,
  config: RateConfig,
  packagesOrPkg: PackagePlan[] | PackagePlan | null,
  records: Record<string, DayRecord>,
  activePackageId?: string | null
): Promise<{ success: boolean; error?: any }> {
  if (!db) return { success: false, error: 'Database not initialized' };
  try {
    const packagesArray: PackagePlan[] = Array.isArray(packagesOrPkg)
      ? packagesOrPkg
      : packagesOrPkg
      ? [packagesOrPkg]
      : [];
    const activePkg = packagesArray.find((p) => p.status === 'active') || packagesArray[0] || null;

    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        config,
        pkg: activePkg,
        packages: packagesArray,
        activePackageId: activePackageId || activePkg?.id || null,
        records,
        lastSyncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err) {
    console.error('Error syncing Firestore user data:', err);
    return { success: false, error: err };
  }
}
