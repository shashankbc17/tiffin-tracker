import React from 'react';
import { Calendar, CheckCircle2, PackageCheck, BarChart3, Settings } from 'lucide-react';

export type TabKey = 'today' | 'calendar' | 'package' | 'analytics' | 'settings';

interface IosTabBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  carryOverCount?: number;
}

export const IosTabBar: React.FC<IosTabBarProps> = ({
  activeTab,
  onSelectTab,
  carryOverCount = 0,
}) => {
  const tabs = [
    { key: 'today' as TabKey, label: 'Today', icon: CheckCircle2 },
    { key: 'calendar' as TabKey, label: 'Calendar', icon: Calendar },
    { 
      key: 'package' as TabKey, 
      label: 'Package', 
      icon: PackageCheck,
      badge: carryOverCount > 0 ? `+${carryOverCount}` : undefined 
    },
    { key: 'analytics' as TabKey, label: 'Statement', icon: BarChart3 },
    { key: 'settings' as TabKey, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="ios-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            className={`tab-button ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.key)}
            style={{ position: 'relative' }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    background: 'var(--accent-carryover)',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 5px rgba(139, 92, 246, 0.5)'
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
