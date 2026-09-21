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
  subscribeToCloudUserData,
  generateSampleData
} from './services/storage';
import { 
  formatDate, 
  calculateCarryOver,
  getIstNow,
  runAutoDeliveryCheck,
  isTodayCutoffPassedForPackage,
  getAdjustedStartDateIfCutoffPassed
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

import './styles/ios-theme.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [user, setUser] = useState<User | null>(null);
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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local_only'>('local_only');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Derive activePackage from activePackageId or fallback
  const activePackage = 
    packages.find((p) => p.id === activePackageId) ||
    packages.find((p) => p.status === 'active') ||
    packages[0] ||
    null;

  // Subscribe to Firebase Auth & Real-Time Cloud Sync across all devices
  useEffect(() => {
    checkRedirectAuth().then((u) => {
      if (u) setUser(u);
    }).catch((err: any) => {
      if (err.code === 'auth/multi-factor-auth-required' && err.resolver) {
        setMfaResolver(err.resolver);
      }
    });

    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);

      // Clean up previous Firestore listener if user switches or logs out
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (currentUser) {
        setSyncStatus('syncing');

        // 1. If user document doesn't exist in cloud yet, seed with initial local state
        const cloudData = await syncUserDataFromCloud(currentUser.uid);
        if (!cloudData) {
          const res = await syncUserDataToCloud(currentUser.uid, config, packages, records, activePackageId);
          if (!res.success) {
            setSyncStatus('error');
            setSyncErrorMsg(res.error?.message || 'Failed to seed initial cloud data');
          }
        }

        // 2. Start real-time Firestore WebSocket listener (~100ms sync across all devices!)
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
            if (data.packages && Array.isArray(data.packages) && data.packages.length > 0) {
              setPackages(data.packages);
              saveLocalPackages(data.packages);
            } else if (data.pkg) {
              setPackages([data.pkg]);
              saveLocalPackages([data.pkg]);
            }
            if (data.activePackageId) {
              setActivePackageId(data.activePackageId);
              saveLocalActivePackageId(data.activePackageId);
            }
            if (data.records) {
              setRecords(data.records);
              saveLocalRecords(data.records);
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

  // If any package started today but was added after cutoff with no meals logged,
  // automatically advance its start date to tomorrow so it waits until the next day.
  useEffect(() => {
    if (packages.length === 0) return;
    let hasChanges = false;
    const adjusted = packages.map((pkg) => {
      if (isTodayCutoffPassedForPackage(pkg, config, records)) {
        hasChanges = true;
        return {
          ...pkg,
          startDate: getAdjustedStartDateIfCutoffPassed(pkg, config, records),
        };
      }
      return pkg;
    });

    if (hasChanges) {
      setPackages(adjusted);
      saveLocalPackages(adjusted);
      if (user) {
        syncUserDataToCloud(user.uid, config, adjusted, records, activePackageId);
      }
    }
  }, [packages, records, config, user, activePackageId]);

  // Compute live carry-over and stats for currently active package
  const stats = calculateCarryOver(activePackage, records, config);

  const handleUpdateRecord = (updated: DayRecord) => {
    const next = { ...records, [updated.date]: updated };
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncUserDataToCloud(user.uid, config, packages, next, activePackageId);
    }
  };

  const handleClearRecord = (dateStr: string) => {
    const next = { ...records };
    delete next[dateStr];
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncUserDataToCloud(user.uid, config, packages, next, activePackageId);
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

    setIsNewPackageModalOpen(false);
    setEditingPackage(null);

    if (user) {
      syncUserDataToCloud(user.uid, config, nextPackages, records, newPkg.id);
    }
  };

  const handleDeletePackage = (deleteLogs: boolean) => {
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
      syncUserDataToCloud(user.uid, config, nextPackages, nextRecords, nextActiveId);
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

  const handleResetData = () => {
    if (window.confirm('Reset app data to sample tiffin subscription?')) {
      const sample = generateSampleData();
      setPackages([sample.defaultPkg]);
      saveLocalPackages([sample.defaultPkg]);
      setActivePackageId(sample.defaultPkg.id);
      saveLocalActivePackageId(sample.defaultPkg.id);
      setRecords(sample.records);
      saveLocalRecords(sample.records);
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Active Plan Card with Multi-Plan Selector */}
            <PackageSummaryCard
              pkg={activePackage}
              packages={packages}
              selectedPackageId={activePackageId}
              onSelectPackage={handleSelectPackage}
              stats={stats}
              config={config}
              onOpenNewPackage={handleOpenCreateModal}
              onEditPackage={handleOpenEditModal}
              onDeletePackage={handleDeletePackage}
            />

            {/* Interactive Calendar with 1-Tap Confirmation Bar */}
            <MealCalendar
              records={records}
              config={config}
              activePackage={activePackage}
              onSaveRecord={handleUpdateRecord}
              onClearRecord={handleClearRecord}
            />
          </div>
        )}

        {/* Dedicated Plan Details Tab */}
        {activeTab === 'package' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <PackageSummaryCard
              pkg={activePackage}
              packages={packages}
              selectedPackageId={activePackageId}
              onSelectPackage={handleSelectPackage}
              stats={stats}
              config={config}
              onOpenNewPackage={handleOpenCreateModal}
              onEditPackage={handleOpenEditModal}
              onDeletePackage={handleDeletePackage}
            />
          </div>
        )}

        {/* Financial & WhatsApp Statement Tab with Expandable Activity Logs */}
        {activeTab === 'analytics' && (
          <ExpenseBreakdown
            stats={stats}
            config={config}
            activePackage={activePackage}
            records={records}
            onOpenDayDetails={(dateStr) => setHistoryDetailDate(dateStr)}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsView
            config={config}
            currentUser={user}
            onSaveConfig={handleSaveConfig}
            onResetData={handleResetData}
            onOpenGuide={() => setIsHowToUseModalOpen(true)}
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
    </div>
  );
};

export default App;
