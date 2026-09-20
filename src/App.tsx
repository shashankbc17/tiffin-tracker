import React, { useState, useEffect } from 'react';
import { User, MultiFactorResolver } from 'firebase/auth';
import { DayRecord, PackagePlan, RateConfig } from './types';
import { 
  loadLocalConfig, 
  saveLocalConfig, 
  loadLocalPackage, 
  saveLocalPackage, 
  loadLocalRecords, 
  saveLocalRecords, 
  syncUserDataFromCloud, 
  syncUserDataToCloud,
  generateSampleData
} from './services/storage';
import { 
  formatDate, 
  calculateCarryOver,
  getIstNow
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
import { PackageSummaryCard } from './components/package/PackageSummaryCard';
import { NewPackageModal } from './components/package/NewPackageModal';
import { ExpenseBreakdown } from './components/analytics/ExpenseBreakdown';
import { SettingsView } from './components/settings/SettingsView';
import { MfaModal } from './components/common/MfaModal';
import { ProfileModal } from './components/common/ProfileModal';

import './styles/ios-theme.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<RateConfig>(loadLocalConfig);
  const [activePackage, setActivePackage] = useState<PackagePlan | null>(loadLocalPackage);
  const [records, setRecords] = useState<Record<string, DayRecord>>(loadLocalRecords);
  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileRevision, setProfileRevision] = useState(0);
  const [editingPackage, setEditingPackage] = useState<PackagePlan | null>(null);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);

  const todayStr = getIstNow().dateStr;

  // Subscribe to Firebase Auth
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
        // Attempt cloud sync
        const cloudData = await syncUserDataFromCloud(currentUser.uid);
        if (cloudData) {
          if (cloudData.config) {
            setConfig(cloudData.config);
            saveLocalConfig(cloudData.config);
          }
          if (cloudData.pkg !== undefined) {
            setActivePackage(cloudData.pkg);
            saveLocalPackage(cloudData.pkg);
          }
          if (cloudData.records) {
            setRecords(cloudData.records);
            saveLocalRecords(cloudData.records);
          }
        } else {
          // Push initial local state to cloud
          await syncUserDataToCloud(currentUser.uid, config, activePackage, records);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Compute live carry-over and stats
  const stats = calculateCarryOver(activePackage, records, config);

  const handleUpdateRecord = (updated: DayRecord) => {
    const next = { ...records, [updated.date]: updated };
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncUserDataToCloud(user.uid, config, activePackage, next);
    }
  };

  const handleClearRecord = (dateStr: string) => {
    const next = { ...records };
    delete next[dateStr];
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncUserDataToCloud(user.uid, config, activePackage, next);
    }
  };

  const handleSavePackage = (newPkg: PackagePlan) => {
    setActivePackage(newPkg);
    saveLocalPackage(newPkg);
    setIsNewPackageModalOpen(false);
    setEditingPackage(null);
    if (user) {
      syncUserDataToCloud(user.uid, config, newPkg, records);
    }
  };

  const handleDeletePackage = (deleteLogs: boolean) => {
    setActivePackage(null);
    saveLocalPackage(null);
    if (deleteLogs) {
      setRecords({});
      saveLocalRecords({});
    }
    if (user) {
      syncUserDataToCloud(user.uid, config, null, deleteLogs ? {} : records);
    }
  };

  const handleSaveConfig = (newConfig: RateConfig) => {
    setConfig(newConfig);
    saveLocalConfig(newConfig);
    if (user) {
      syncUserDataToCloud(user.uid, newConfig, activePackage, records);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset app data to sample tiffin subscription?')) {
      const sample = generateSampleData();
      setActivePackage(sample.defaultPkg);
      saveLocalPackage(sample.defaultPkg);
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
        packageTitle={activePackage ? `${activePackage.title}` : undefined}
      />

      {/* Main Content Area */}
      <main className="app-content">
        {/* Calendar / Tracker is the primary main view */}
        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Active Plan Card */}
            <PackageSummaryCard
              pkg={activePackage}
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
              stats={stats}
              config={config}
              onOpenNewPackage={handleOpenCreateModal}
              onEditPackage={handleOpenEditModal}
              onDeletePackage={handleDeletePackage}
            />
          </div>
        )}

        {/* Financial & WhatsApp Statement Tab */}
        {activeTab === 'analytics' && (
          <ExpenseBreakdown
            stats={stats}
            config={config}
            activePackage={activePackage}
            records={records}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsView
            config={config}
            currentUser={user}
            onSaveConfig={handleSaveConfig}
            onResetData={handleResetData}
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
