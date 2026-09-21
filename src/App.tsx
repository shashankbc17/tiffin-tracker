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
  generateSampleData
} from './services/storage';
import { 
  formatDate, 
  calculateCarryOver,
  getIstNow,
  runAutoDeliveryCheck
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

  // Derive activePackage from activePackageId or fallback
  const activePackage = 
    packages.find((p) => p.id === activePackageId) ||
    packages.find((p) => p.status === 'active') ||
    packages[0] ||
    null;

  // Subscribe to Firebase Auth & Cloud Sync
  useEffect(() => {
    checkRedirectAuth().then((u) => {
      if (u) setUser(u);
    }).catch((err: any) => {
      if (err.code === 'auth/multi-factor-auth-required' && err.resolver) {
        setMfaResolver(err.resolver);
      }
    });

    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const cloudData = await syncUserDataFromCloud(currentUser.uid);
        if (cloudData) {
          if (cloudData.config) {
            setConfig(cloudData.config);
            saveLocalConfig(cloudData.config);
          }
          if (cloudData.packages && Array.isArray(cloudData.packages) && cloudData.packages.length > 0) {
            setPackages(cloudData.packages);
            saveLocalPackages(cloudData.packages);
          } else if (cloudData.pkg) {
            setPackages([cloudData.pkg]);
            saveLocalPackages([cloudData.pkg]);
          }
          if (cloudData.records) {
            setRecords(cloudData.records);
            saveLocalRecords(cloudData.records);
          }
        } else {
          // Push initial local state to cloud
          await syncUserDataToCloud(currentUser.uid, config, packages, records);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Automated Delivery Check (Runs on launch + every 60 seconds)
  useEffect(() => {
    const checkAndApplyAutoDelivery = () => {
      const { updatedRecords, hasChanges } = runAutoDeliveryCheck(packages, records, config);
      if (hasChanges) {
        setRecords(updatedRecords);
        saveLocalRecords(updatedRecords);
        if (user) {
          syncUserDataToCloud(user.uid, config, packages, updatedRecords);
        }
      }
    };

    checkAndApplyAutoDelivery();
    const interval = setInterval(checkAndApplyAutoDelivery, 60000);
    return () => clearInterval(interval);
  }, [packages, records, config, user]);

  // Compute live carry-over and stats for currently active package
  const stats = calculateCarryOver(activePackage, records, config);

  const handleUpdateRecord = (updated: DayRecord) => {
    const next = { ...records, [updated.date]: updated };
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncUserDataToCloud(user.uid, config, packages, next);
    }
  };

  const handleClearRecord = (dateStr: string) => {
    const next = { ...records };
    delete next[dateStr];
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncUserDataToCloud(user.uid, config, packages, next);
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
      syncUserDataToCloud(user.uid, config, nextPackages, records);
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
      syncUserDataToCloud(user.uid, config, nextPackages, nextRecords);
    }
  };

  const handleSelectPackage = (id: string) => {
    setActivePackageId(id);
    saveLocalActivePackageId(id);
  };

  const handleSaveConfig = (newConfig: RateConfig) => {
    setConfig(newConfig);
    saveLocalConfig(newConfig);
    if (user) {
      syncUserDataToCloud(user.uid, newConfig, packages, records);
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
        onLogin={handleGoogleLogin}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenGuide={() => setIsHowToUseModalOpen(true)}
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
    </div>
  );
};

export default App;
