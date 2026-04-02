/**
 * 全局设置上下文
 * 管理界面语言、主题模式等用户偏好设置
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type Language = 'zh-CN' | 'en-US';

interface SettingsContextType {
  themeMode: ThemeMode;
  language: Language;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// 获取系统主题偏好
function getSystemTheme(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// 从 localStorage 读取设置
function loadSettings(): { themeMode: ThemeMode; language: Language } {
  if (typeof window === 'undefined') {
    return { themeMode: 'dark', language: 'zh-CN' };
  }
  
  const savedTheme = localStorage.getItem('themeMode') as ThemeMode | null;
  const savedLanguage = localStorage.getItem('language') as Language | null;
  
  return {
    themeMode: savedTheme && ['light', 'dark', 'system'].includes(savedTheme) 
      ? savedTheme 
      : 'dark',
    language: savedLanguage && ['zh-CN', 'en-US'].includes(savedLanguage) 
      ? savedLanguage 
      : 'zh-CN'
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [language, setLanguageState] = useState<Language>('zh-CN');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化设置
  useEffect(() => {
    const settings = loadSettings();
    setThemeModeState(settings.themeMode);
    setLanguageState(settings.language);
    setIsLoaded(true);
  }, []);

  // 计算实际是否使用深色模式
  useEffect(() => {
    if (!isLoaded) return;
    
    const isDark = themeMode === 'dark' || (themeMode === 'system' && getSystemTheme());
    setIsDarkMode(isDark);
    
    // 应用主题到 document
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode, isLoaded]);

  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined' || themeMode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('themeMode', mode);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <SettingsContext.Provider value={{
      themeMode,
      language,
      setThemeMode,
      setLanguage,
      isDarkMode
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings 必须在 SettingsProvider 内使用');
  }
  return context;
}
