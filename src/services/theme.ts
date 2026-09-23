export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'tiffin_theme';

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {}
  return 'system';
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  const resolved = getResolvedTheme(mode);
  
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
    
    // Update mobile Safari theme-color header
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolved === 'dark' ? '#090d16' : '#f8fafc');
    }

    const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) {
      appleMeta.setAttribute('content', resolved === 'dark' ? 'black-translucent' : 'default');
    }
  }
}

export function setTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
  applyTheme(mode);
  // Dispatch custom event so all active views can synchronize instantly
  window.dispatchEvent(new CustomEvent('tiffin_theme_changed', { detail: mode }));
}

/**
 * Initialize system preference change listener and apply current theme on boot
 */
export function initThemeListener(): () => void {
  const currentMode = getStoredTheme();
  applyTheme(currentMode);

  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      window.dispatchEvent(new CustomEvent('tiffin_theme_changed', { detail: 'system' }));
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  } else if ((mediaQuery as any).addListener) {
    (mediaQuery as any).addListener(handler);
    return () => (mediaQuery as any).removeListener(handler);
  }

  return () => {};
}
