import React, { useState, useEffect } from 'react';
import { User, MultiFactorResolver } from 'firebase/auth';
import { DayRecord, PackagePlan, RateConfig } from './types';
import { 
  loadLocalConfig, 
  saveLocalConfig, 
  loadLocalPackages, 
  saveLocalPackages, 
  loadLocalActivePackageId,
  saveLocalActivePackageId,
  loadLocalRecords, 
  saveLocalRecords, 
  syncUserDataFromCloud, 
  syncUserDataToCloud,
  syncSingleRecordToCloud,
  deleteRecordFromCloud,
  clearAllRecordsFromCloud,
  clearUserCloudData,
  subscribeToCloudUserData,
  mergeRecords,
  mergePackages,
  generateSampleData
} from './services/storage';
import { 
  formatDate, 
  calculateCarryOver,
  getIstNow,
  runAutoDeliveryCheck,
  isMealActiveOnDate,
  addDays
} from './services/carryOverEngine';
import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeToAuthChanges,
  checkRedirectAuth
} from './services/firebase';

import { IosHeader } from './components/common/IosHeader';
import { IosTabBar, TabKey } from './components/common/IosTabBar';
import { MealCalendar } from './components/calendar/MealCalendar';
import { DayDetailModal } from './components/calendar/DayDetailModal';
import { PackageSummaryCard } from './components/package/PackageSummaryCard';
import { NewPackageModal } from './components/package/NewPackageModal';
import { ExpenseBreakdown } from './components/analytics/ExpenseBreakdown';
import { SettingsView } from './components/settings/SettingsView';
import { MfaModal } from './components/common/MfaModal';
import { ProfileModal } from './components/common/ProfileModal';
import { HowToUseModal } from './components/common/HowToUseModal';
import { SyncModal } from './components/common/SyncModal';
import { FirstUserExperience } from './components/common/FirstUserExperience';
import { StatementExportModal } from './components/analytics/StatementExportModal';

import './styles/ios-theme.css';

const loadInitialTab = (): TabKey => {
  try {
    const saved = localStorage.getItem('tiffin_active_tab') as TabKey;
    if (saved && ['calendar', 'package', 'analytics', 'settings'].includes(saved)) {
      return saved;
    }
  } catch {}
  return 'calendar';
};

const loadCachedAuthUser = (): User | null => {
  try {
    const raw = localStorage.getItem('tiffin_auth_cached_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>(loadInitialTab);
  const [user, setUser] = useState<User | null>(loadCachedAuthUser);
  const [isAuthLoading, setIsAuthLoading] = useState(() => !loadCachedAuthUser());
  const [config, setConfig] = useState<RateConfig>(loadLocalConfig);
  const [packages, setPackages] = useState<PackagePlan[]>(loadLocalPackages);
  const [activePackageId, setActivePackageId] = useState<string | null>(loadLocalActivePackageId);
  const [records, setRecords] = useState<Record<string, DayRecord>>(loadLocalRecords);

  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHowToUseModalOpen, setIsHowToUseModalOpen] = useState(false);
  const [profileRevision, setProfileRevision] = useState(0);
  const [editingPackage, setEditingPackage] = useState<PackagePlan | null>(null);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [historyDetailDate, setHistoryDetailDate] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local_only'>(() => {
    return localStorage.getItem('tiffin_auth_cached_user') ? 'syncing' : 'local_only';
  });
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isHomeEditMode, setIsHomeEditMode] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Persist tab navigation across refreshes
  useEffect(() => {
    try {
      localStorage.setItem('tiffin_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Derive activePackage from activePackageId or fallback
  const activePackage = 
    packages.find((p) => p.id === activePackageId) ||
    packages.find((p) => p.status === 'active') ||
    packages[0] ||
    null;

  // Subscribe to Firebase Auth & Real-Time Cloud Sync across all devices
  useEffect(() => {
    checkRedirectAuth().then((u) => {
      if (u) {
        setUser(u);
        setIsAuthLoading(false);
      }
    }).catch((err: any) => {
      if (err.code === 'auth/multi-factor-auth-required' && err.resolver) {
        setMfaResolver(err.resolver);
      }
    });

    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        try {
          localStorage.setItem('tiffin_auth_cached_user', JSON.stringify({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
          }));
        } catch {}
      } else {
        try {
          localStorage.removeItem('tiffin_auth_cached_user');
        } catch {}
      }

      // Clean up previous Firestore listener if user switches or logs out
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (currentUser) {
        setSyncStatus('syncing');

        // 1. Initial Cloud Sync with 2-Way Merge (Protects iPhone edits from being overwritten by desktop)
        const cloudData = await syncUserDataFromCloud(currentUser.uid);
        if (!cloudData) {
          const res = await syncUserDataToCloud(currentUser.uid, config, packages, records, activePackageId);
          if (!res.success) {
            setSyncStatus('error');
            setSyncErrorMsg(res.error?.message || 'Failed to seed initial cloud data');
          }
        } else {
          // Merge local records with cloud records based on latest updatedAt timestamps
          const localRecs = loadLocalRecords();
          let mergedRecs: Record<string, DayRecord> = {};
          let localWonAny = false;
          if (cloudData.records && Object.keys(cloudData.records).length > 0) {
            const res = mergeRecords(localRecs, cloudData.records);
            mergedRecs = res.merged;
            localWonAny = res.localWonAny;
          } else {
            mergedRecs = localRecs;
          }
          setRecords(mergedRecs);
          saveLocalRecords(mergedRecs);

          const localPkgs = loadLocalPackages();
          const cloudPkgs = Array.isArray(cloudData.packages)
            ? cloudData.packages
            : (cloudData.pkg ? [cloudData.pkg] : []);

          let mergedPkgs: PackagePlan[];
          if (cloudData.packages !== undefined && cloudData.packages.length === 0 && !cloudData.pkg) {
            // Cloud explicitly has 0 packages (deleted in cloud)
            mergedPkgs = [];
          } else {
            mergedPkgs = mergePackages(localPkgs, cloudPkgs);
          }
          setPackages(mergedPkgs);
          saveLocalPackages(mergedPkgs);

          if (cloudData.config) {
            setConfig(cloudData.config);
            saveLocalConfig(cloudData.config);
          }
          if (cloudData.activePackageId) {
            setActivePackageId(cloudData.activePackageId);
            saveLocalActivePackageId(cloudData.activePackageId);
          }

          // If local device had any newer edits than what was stored in cloud, push the merged state to cloud!
          if (localWonAny) {
            await syncUserDataToCloud(
              currentUser.uid,
              cloudData.config || config,
              mergedPkgs,
              mergedRecs,
              cloudData.activePackageId || activePackageId
            );
          }
        }

        // 2. Real-time Firestore WebSocket listener (~100ms sync across all devices!)
        unsubscribeFirestore = subscribeToCloudUserData(
          currentUser.uid,
          (data) => {
            setSyncStatus('synced');
            setSyncErrorMsg(null);
            if (!data) return;
            if (data.config) {
              setConfig(data.config);
              saveLocalConfig(data.config);
            }
            if (data.packages && Array.isArray(data.packages)) {
              if (data.packages.length === 0 && !data.pkg) {
                setPackages([]);
                saveLocalPackages([]);
                setActivePackageId(null);
                saveLocalActivePackageId(null);
              } else {
                setPackages((prevPkgs) => {
                  const merged = mergePackages(prevPkgs, data.packages || []);
                  saveLocalPackages(merged);
                  return merged;
                });
              }
            } else if (data.pkg) {
              setPackages((prevPkgs) => {
                const merged = mergePackages(prevPkgs, [data.pkg!]);
                saveLocalPackages(merged);
                return merged;
              });
            }
            if (data.activePackageId) {
              setActivePackageId(data.activePackageId);
              saveLocalActivePackageId(data.activePackageId);
            }
            if (data.records) {
              setRecords((prevRecs) => {
                const { merged, localWonAny } = mergeRecords(prevRecs, data.records || {});
                saveLocalRecords(merged);
                // If local had a newer edit than this snapshot, propagate back so other device adopts it
                if (localWonAny && currentUser) {
                  syncUserDataToCloud(
                    currentUser.uid,
                    data.config || config,
                    data.packages || packages,
                    merged,
                    data.activePackageId || activePackageId
                  );
                }
                return merged;
              });
            }
          },
          (err) => {
            setSyncStatus('error');
            setSyncErrorMsg(err?.message || 'Database connection error');
          }
        );
      } else {
        setSyncStatus('local_only');
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      unsubscribeAuth();
    };
  }, []);

  // Instantaneous (< 5ms) sync across multiple tabs on the same device
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tiffinflow_records' && e.newValue) {
        try {
          setRecords(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'tiffinflow_packages' && e.newValue) {
        try {
          setPackages(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'tiffinflow_config' && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'tiffinflow_active_pkg_id' && e.newValue) {
        setActivePackageId(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Instant re-sync whenever mobile phone tab wakes up, unlocks, or regains focus
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && user) {
        try {
          const freshCloud = await syncUserDataFromCloud(user.uid);
          if (freshCloud?.records) {
            setRecords((prev) => {
              const { merged } = mergeRecords(prev, freshCloud.records || {});
              saveLocalRecords(merged);
              return merged;
            });
          }
          if (freshCloud?.packages) {
            setPackages((prev) => {
              const merged = mergePackages(prev, freshCloud.packages || []);
              saveLocalPackages(merged);
              return merged;
            });
          }
          if (freshCloud?.activePackageId) {
            setActivePackageId(freshCloud.activePackageId);
            saveLocalActivePackageId(freshCloud.activePackageId);
          }
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [user]);

  // Automated Delivery Check (Runs on launch + every 60 seconds)
  useEffect(() => {
    const checkAndApplyAutoDelivery = () => {
      const { updatedRecords, hasChanges } = runAutoDeliveryCheck(packages, records, config);
      if (hasChanges) {
        setRecords(updatedRecords);
        saveLocalRecords(updatedRecords);
        if (user) {
          syncUserDataToCloud(user.uid, config, packages, updatedRecords, activePackageId);
        }
      }
    };

    checkAndApplyAutoDelivery();
    const interval = setInterval(checkAndApplyAutoDelivery, 60000);
    return () => clearInterval(interval);
  }, [packages, records, config, user, activePackageId]);

  // Compute live carry-over and stats for currently active package
  const stats = calculateCarryOver(activePackage, records, config);

  const handleUpdateRecord = (updated: DayRecord) => {
    const { dateStr: todayStr } = getIstNow();
    // Safety guard: future dates must never be marked as delivered
    if (updated.date > todayStr) {
      if (updated.breakfast?.status === 'delivered' || updated.breakfast?.status === 'extra') {
        updated.breakfast.status = 'none';
      }
      if (updated.lunch?.status === 'delivered' || updated.lunch?.status === 'extra') {
        updated.lunch.status = 'none';
      }
    }

    const next = { ...records, [updated.date]: updated };
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncSingleRecordToCloud(user.uid, updated);
    }
  };

  const handleClearRecord = (dateStr: string) => {
    const next = { ...records };
    delete next[dateStr];
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      deleteRecordFromCloud(user.uid, dateStr);
    }
  };

  const handleClearMonthRecords = (year: number, month: number) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const next = { ...records };
    const datesToDelete: string[] = [];

    for (const d of Object.keys(next)) {
      if (d.startsWith(prefix)) {
        delete next[d];
        datesToDelete.push(d);
      }
    }

    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      for (const d of datesToDelete) {
        deleteRecordFromCloud(user.uid, d);
      }
    }
  };

  const handleClearAutoMarkedRecords = () => {
    const next = { ...records };
    const datesToDelete: string[] = [];

    for (const [d, rec] of Object.entries(next)) {
      const isAuto = (
        (rec.breakfast?.autoDelivered || rec.breakfast?.status === 'none' || !rec.breakfast?.status) &&
        (rec.lunch?.autoDelivered || rec.lunch?.status === 'none' || !rec.lunch?.status) &&
        !rec.isCookOff
      );
      if (isAuto) {
        delete next[d];
        datesToDelete.push(d);
      }
    }

    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      for (const d of datesToDelete) {
        deleteRecordFromCloud(user.uid, d);
      }
    }
  };

  const handleSavePackage = (newPkg: PackagePlan) => {
    const idx = packages.findIndex((p) => p.id === newPkg.id);
    let nextPackages: PackagePlan[];
    if (idx >= 0) {
      nextPackages = [...packages];
      nextPackages[idx] = newPkg;
    } else {
      nextPackages = [newPkg, ...packages];
    }
    setPackages(nextPackages);
    saveLocalPackages(nextPackages);
    setActivePackageId(newPkg.id);
    saveLocalActivePackageId(newPkg.id);

    // If start date is today or in the past, assume food was delivered according to the opted
    // day-of-week schedule up to today, deducting the plan automatically.
    const { dateStr: todayStr } = getIstNow();
    let nextRecords = { ...records };
    let hasBackfilled = false;

    if (newPkg.startDate <= todayStr) {
      const isCreatingNewPlan = !editingPackage;
      let cur = newPkg.startDate;
      while (cur <= todayStr) {
        const isBActive = newPkg.includesBreakfast !== false && isMealActiveOnDate(cur, newPkg, 'breakfast');
        const isLActive = newPkg.includesLunch !== false && isMealActiveOnDate(cur, newPkg, 'lunch');

        if (isBActive || isLActive) {
          const existing = nextRecords[cur];
          const hasExistingDeliveredOrSkipped = Boolean(
            existing && (
              (existing.breakfast?.status && existing.breakfast.status !== 'none') ||
              (existing.lunch?.status && existing.lunch.status !== 'none') ||
              existing.isCookOff
            )
          );

          // When creating a new plan, assume every scheduled food was delivered so plan is deducted up to current date.
          // When modifying an existing plan, backfill unlogged days.
          if (isCreatingNewPlan || !hasExistingDeliveredOrSkipped) {
            nextRecords[cur] = {
              date: cur,
              breakfast: isBActive
                ? {
                    status: 'delivered',
                    persons: newPkg.defaultPersons || config.defaultPersons || 1,
                    rate: newPkg.breakfastRate || config.defaultBreakfastRate || 60,
                  }
                : {
                    status: 'none',
                    persons: 1,
                    rate: config.defaultBreakfastRate || 60,
                  },
              lunch: isLActive
                ? {
                    status: 'delivered',
                    persons: newPkg.defaultPersons || config.defaultPersons || 1,
                    rate: newPkg.lunchRate || config.defaultLunchRate || 90,
                  }
                : {
                    status: 'none',
                    persons: 1,
                    rate: config.defaultLunchRate || 90,
                  },
              isCookOff: false,
              notes: 'Initial plan deduction',
              updatedAt: new Date().toISOString(),
            };
            hasBackfilled = true;
          }
        }
        cur = addDays(cur, 1);
      }
    }

    if (hasBackfilled) {
      setRecords(nextRecords);
      saveLocalRecords(nextRecords);
    }

    setIsNewPackageModalOpen(false);
    setEditingPackage(null);

    if (user) {
      syncUserDataToCloud(user.uid, config, nextPackages, nextRecords, newPkg.id);
    }
  };

  const handleDeletePackage = async (deleteLogs: boolean) => {
    if (!activePackage) return;
    const nextPackages = packages.filter((p) => p.id !== activePackage.id);
    setPackages(nextPackages);
    saveLocalPackages(nextPackages);

    const nextActiveId = nextPackages[0]?.id || null;
    setActivePackageId(nextActiveId);
    saveLocalActivePackageId(nextActiveId);

    const nextRecords = deleteLogs ? {} : records;
    if (deleteLogs) {
      setRecords({});
      saveLocalRecords({});
    }

    if (user) {
      if (nextPackages.length === 0 && deleteLogs) {
        await clearUserCloudData(user.uid);
      } else {
        await syncUserDataToCloud(user.uid, config, nextPackages, nextRecords, nextActiveId);
      }
    }
  };

  const handleSelectPackage = (id: string) => {
    setActivePackageId(id);
    saveLocalActivePackageId(id);
    if (user) {
      syncUserDataToCloud(user.uid, config, packages, records, id);
    }
  };

  const handleSaveConfig = (newConfig: RateConfig) => {
    setConfig(newConfig);
    saveLocalConfig(newConfig);
    if (user) {
      syncUserDataToCloud(user.uid, newConfig, packages, records, activePackageId);
    }
  };

  const handleLoadSampleData = () => {
    const sample = generateSampleData();
    setPackages([sample.defaultPkg]);
    saveLocalPackages([sample.defaultPkg]);
    setActivePackageId(sample.defaultPkg.id);
    saveLocalActivePackageId(sample.defaultPkg.id);
    setRecords(sample.records);
    saveLocalRecords(sample.records);
    if (user) {
      syncUserDataToCloud(user.uid, config, [sample.defaultPkg], sample.records, sample.defaultPkg.id);
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all meal subscriptions and logs? You will start fresh with no active plan.')) {
      setPackages([]);
      saveLocalPackages([]);
      setActivePackageId(null);
      saveLocalActivePackageId(null);
      setRecords({});
      saveLocalRecords({});
      if (user) {
        await clearUserCloudData(user.uid);
      }
    }
  };

  const handleWipeCloudData = async () => {
    if (!user) {
      alert('Please log in with Google first to wipe your cloud data.');
      return;
    }
    const confirmed = window.confirm(
      `⚠️ PERMANENT CLOUD PURGE:\n\nAre you sure you want to permanently delete all data in Cloud Firestore for ${user.email}?\n\nThis will completely delete users/${user.uid} from Firebase so no old packages or records can resurrect on refresh.`
    );
    if (!confirmed) return;

    setSyncStatus('syncing');
    const res = await clearUserCloudData(user.uid);
    if (res.success) {
      setPackages([]);
      saveLocalPackages([]);
      setActivePackageId(null);
      saveLocalActivePackageId(null);
      setRecords({});
      saveLocalRecords({});
      setSyncStatus('synced');
      alert(`✅ Cloud database successfully wiped for ${user.email}! All cloud and local records have been cleared.`);
    } else {
      setSyncStatus('error');
      alert(`Failed to wipe cloud data: ${res.error?.message || 'Unknown error'}`);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Load sample tiffin subscription and starter data?')) {
      handleLoadSampleData();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-auth-required' && err.resolver) {
        setMfaResolver(err.resolver);
        return;
      }
      alert(`Google Sign In note: ${err.message || 'Please configure Firebase in Settings for cloud sync, or continue using fast offline storage!'}`);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('tiffin_auth_cached_user');
    } catch {}
    setUser(null);
    setSyncStatus('local_only');
    setIsProfileModalOpen(false);
    await logoutUser();
  };

  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setIsNewPackageModalOpen(true);
  };

  const handleOpenEditModal = () => {
    setEditingPackage(activePackage);
    setIsNewPackageModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* iOS Top Navigation Header */}
      <IosHeader
        key={profileRevision}
        user={user}
        isAuthLoading={isAuthLoading}
        syncStatus={syncStatus}
        onLogin={handleGoogleLogin}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenGuide={() => setIsHowToUseModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        packageTitle={activePackage ? activePackage.title : undefined}
      />

      {/* Main Content Area */}
      <main className="app-content">
        {/* Calendar / Tracker is the primary main view */}
        {activeTab === 'calendar' && (
          packages.length === 0 ? (
            <FirstUserExperience
              onOpenNewPackage={handleOpenCreateModal}
              onOpenGuide={() => setIsHowToUseModalOpen(true)}
              onLoadSampleData={handleLoadSampleData}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Master Edit & Manage Toggle Switch */}
              <div
                className="ios-card"
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isHomeEditMode
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(15, 23, 42, 0.92) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isHomeEditMode
                    ? '1px solid rgba(139, 92, 246, 0.45)'
                    : '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isHomeEditMode ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                    }}
                  >
                    {isHomeEditMode ? '✏️' : '🔒'}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isHomeEditMode ? '#f8fafc' : 'var(--text-secondary)' }}>
                      {isHomeEditMode ? 'Edit & Delete Controls: ON' : 'Master Edit Switch: OFF'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isHomeEditMode
                        ? 'Edit plan, delete plan, and clear buttons are revealed'
                        : 'Toggle ON to reveal edit & delete options for each section'}
                    </div>
                  </div>
                </div>

                {/* iOS Cupertino Style Switch */}
                <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={isHomeEditMode}
                    onChange={(e) => setIsHomeEditMode(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: isHomeEditMode ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.16)',
                      transition: '0.2s ease',
                      borderRadius: '26px',
                      border: isHomeEditMode ? '1px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '20px',
                        width: '20px',
                        left: isHomeEditMode ? '22px' : '3px',
                        bottom: '2px',
                        backgroundColor: 'white',
                        transition: '0.2s ease',
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Active Plan Card with Multi-Plan Selector */}
              <PackageSummaryCard
                pkg={activePackage}
                packages={packages}
                selectedPackageId={activePackageId}
                onSelectPackage={handleSelectPackage}
                stats={stats}
                config={config}
                records={records}
                isEditMode={isHomeEditMode}
                onOpenNewPackage={handleOpenCreateModal}
                onEditPackage={handleOpenEditModal}
                onDeletePackage={handleDeletePackage}
              />

              {/* Interactive Calendar with 1-Tap Confirmation Bar */}
              <MealCalendar
                records={records}
                config={config}
                activePackage={activePackage}
                isEditMode={isHomeEditMode}
                onSaveRecord={handleUpdateRecord}
                onClearRecord={handleClearRecord}
                onClearMonth={handleClearMonthRecords}
                onClearAutoMarked={handleClearAutoMarkedRecords}
              />
            </div>
          )
        )}

        {/* Dedicated Plan Details Tab */}
        {activeTab === 'package' && (
          packages.length === 0 ? (
            <FirstUserExperience
              onOpenNewPackage={handleOpenCreateModal}
              onOpenGuide={() => setIsHowToUseModalOpen(true)}
              onLoadSampleData={handleLoadSampleData}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <PackageSummaryCard
                pkg={activePackage}
                packages={packages}
                selectedPackageId={activePackageId}
                onSelectPackage={handleSelectPackage}
                stats={stats}
                config={config}
                records={records}
                onOpenNewPackage={handleOpenCreateModal}
                onEditPackage={handleOpenEditModal}
                onDeletePackage={handleDeletePackage}
                onExtractStatement={() => setIsStatementModalOpen(true)}
              />
            </div>
          )
        )}

        {/* Financial & WhatsApp Statement Tab with Expandable Activity Logs */}
        {activeTab === 'analytics' && (
          <ExpenseBreakdown
            stats={stats}
            config={config}
            activePackage={activePackage}
            records={records}
            onOpenDayDetails={(dateStr) => setHistoryDetailDate(dateStr)}
            onOpenStatementModal={() => setIsStatementModalOpen(true)}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsView
            config={config}
            currentUser={user}
            onSaveConfig={handleSaveConfig}
            onResetData={handleResetData}
            onClearAllData={handleClearAllData}
            onWipeCloudData={handleWipeCloudData}
            onOpenGuide={() => setIsHowToUseModalOpen(true)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        )}
      </main>

      {/* iOS Bottom Navigation Bar */}
      <IosTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        carryOverCount={stats.carryOverDays}
      />

      {/* Create / Edit Plan Modal */}
      {isNewPackageModalOpen && (
        <NewPackageModal
          config={config}
          initialPackage={editingPackage}
          onSavePackage={handleSavePackage}
          onClose={() => {
            setIsNewPackageModalOpen(false);
            setEditingPackage(null);
          }}
        />
      )}

      {/* User Profile & Account Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          user={user}
          onLogout={handleLogout}
          onClose={() => setIsProfileModalOpen(false)}
          onProfileUpdated={() => setProfileRevision((r) => r + 1)}
        />
      )}

      {/* Senior-Friendly How to Use Guide Modal */}
      {isHowToUseModalOpen && (
        <HowToUseModal
          onClose={() => setIsHowToUseModalOpen(false)}
        />
      )}

      {/* Edit Day Record Modal from History Logs */}
      {historyDetailDate && (
        <DayDetailModal
          dateStr={historyDetailDate}
          record={records[historyDetailDate]}
          config={config}
          activePackage={activePackage}
          onSave={handleUpdateRecord}
          onClear={handleClearRecord}
          onClose={() => setHistoryDetailDate(null)}
        />
      )}

      {/* SMS Multi-Factor Authentication Modal */}
      {mfaResolver && (
        <MfaModal
          resolver={mfaResolver}
          onSuccess={(authenticatedUser) => {
            setUser(authenticatedUser);
            setMfaResolver(null);
          }}
          onClose={() => setMfaResolver(null)}
        />
      )}

      {/* Real-Time Sync Diagnostics & Setup Modal */}
      {isSyncModalOpen && (
        <SyncModal
          user={user}
          syncStatus={syncStatus}
          syncErrorMsg={syncErrorMsg}
          onLogin={handleGoogleLogin}
          onClose={() => setIsSyncModalOpen(false)}
        />
      )}

      {/* Official Bank-Style Statement & Extract Modal */}
      {isStatementModalOpen && (
        <StatementExportModal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          records={records}
          activePackage={activePackage}
          config={config}
        />
      )}
    </div>
  );
};

export default App;
