import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { DayRecord, PackagePlan, RateConfig, MealStatus } from './types';
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
  calculateCarryOver 
} from './services/carryOverEngine';
import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeToAuthChanges,
  checkRedirectAuth
} from './services/firebase';

import { IosHeader } from './components/common/IosHeader';
import { IosTabBar, TabKey } from './components/common/IosTabBar';
import { TodayQuickLogger } from './components/today/TodayQuickLogger';
import { MealCalendar } from './components/calendar/MealCalendar';
import { PackageSummaryCard } from './components/package/PackageSummaryCard';
import { NewPackageModal } from './components/package/NewPackageModal';
import { ExpenseBreakdown } from './components/analytics/ExpenseBreakdown';
import { SettingsView } from './components/settings/SettingsView';

import './styles/ios-theme.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<RateConfig>(loadLocalConfig);
  const [activePackage, setActivePackage] = useState<PackagePlan | null>(loadLocalPackage);
  const [records, setRecords] = useState<Record<string, DayRecord>>(loadLocalRecords);
  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState(false);

  const todayStr = formatDate(new Date());

  // Subscribe to Firebase Auth
  useEffect(() => {
    checkRedirectAuth().catch(console.error);
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

  // Helper for Today's record
  const getTodayRecord = (): DayRecord => {
    if (records[todayStr]) {
      return records[todayStr];
    }
    // Default today record initialized
    return {
      date: todayStr,
      breakfast: {
        status: 'delivered',
        persons: config.defaultPersons || 1,
        rate: activePackage?.breakfastRate || config.defaultBreakfastRate,
      },
      lunch: {
        status: 'delivered',
        persons: config.defaultPersons || 1,
        rate: activePackage?.lunchRate || config.defaultLunchRate,
      },
      isCookOff: false,
    };
  };

  const handleUpdateRecord = (updated: DayRecord) => {
    const next = { ...records, [updated.date]: updated };
    setRecords(next);
    saveLocalRecords(next);
    if (user) {
      syncUserDataToCloud(user.uid, config, activePackage, next);
    }
  };

  const handleSavePackage = (newPkg: PackagePlan) => {
    setActivePackage(newPkg);
    saveLocalPackage(newPkg);
    if (user) {
      syncUserDataToCloud(user.uid, config, newPkg, records);
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
    if (window.confirm('Reset app data to sample tiffin subscription with 12 days history?')) {
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
      alert(`Google Sign In note: ${err.message || 'Please configure Firebase in Settings for cloud sync, or continue using fast offline storage!'}`);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <div className="app-container">
      {/* iOS Top Navigation Header */}
      <IosHeader
        user={user}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        packageTitle={activePackage ? `${activePackage.title}` : undefined}
      />

      {/* Main Content Area */}
      <main className="app-content">
        {activeTab === 'today' && (
          <>
            <TodayQuickLogger
              todayRecord={getTodayRecord()}
              config={config}
              activePackage={activePackage}
              onUpdateRecord={handleUpdateRecord}
            />
            <PackageSummaryCard
              pkg={activePackage}
              stats={stats}
              config={config}
              onOpenNewPackage={() => setIsNewPackageModalOpen(true)}
            />
          </>
        )}

        {activeTab === 'calendar' && (
          <MealCalendar
            records={records}
            config={config}
            activePackage={activePackage}
            onSaveRecord={handleUpdateRecord}
          />
        )}

        {activeTab === 'package' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <PackageSummaryCard
              pkg={activePackage}
              stats={stats}
              config={config}
              onOpenNewPackage={() => setIsNewPackageModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <ExpenseBreakdown
            stats={stats}
            config={config}
            activePackage={activePackage}
            records={records}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            config={config}
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

      {/* New Package Modal */}
      {isNewPackageModalOpen && (
        <NewPackageModal
          config={config}
          onSavePackage={handleSavePackage}
          onClose={() => setIsNewPackageModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
