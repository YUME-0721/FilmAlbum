/**
 * 全局设置上下文
 * 管理界面语言、主题模式等用户偏好设置
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { get } from '../api/client.ts';

type ThemeMode = 'light' | 'dark' | 'system';
type Language = 'zh-CN' | 'en-US';

interface SettingsContextType {
  themeMode: ThemeMode;
  language: Language;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  isDarkMode: boolean;
  openRegistration: boolean;
  lv2RollLimit: number;
  rollFormats: {format: string, label: string, frames: string[], frameCols?: Record<string, number>}[];
  filmTypes: string[];
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
  const [openRegistration, setOpenRegistration] = useState(true);
  const [lv2RollLimit, setLv2RollLimit] = useState(10);
  const [rollFormats, setRollFormats] = useState<{format: string, label: string, frames: string[], frameCols?: Record<string, number>}[]>([{"format":"135","label":"35mm (135)","frames":["半格","35mm","xpan"],"frameCols":{"半格":12,"35mm":6,"xpan":1}},{"format":"120","label":"中画幅 (120)","frames":["620","630","645","6x6","6x7","6x9"],"frameCols":{"620":1,"630":1,"645":4,"6x6":3,"6x7":3,"6x9":2}}]);
  const [filmTypes, setFilmTypes] = useState<string[]>(["彩色负片","黑白负片","彩色反转片","黑白反转片"]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化设置
  useEffect(() => {
    const initSettings = async () => {
      const settings = loadSettings();
      let defaultLang = settings.language;
      let regOpen = true;
      let limit = 10;

      try {
        const res = await get<{ openRegistration: boolean; defaultLanguage: Language; lv2RollLimit: number; rollFormats?: any[]; filmTypes?: string[] }>('/system/settings');
        if (res.success && res.data) {
          regOpen = res.data.openRegistration;
          limit = res.data.lv2RollLimit;
          // 如果本地没有保存语言偏好，则使用全局默认语言
          if (!localStorage.getItem('language')) {
            defaultLang = res.data.defaultLanguage;
          }
          if (res.data.rollFormats) setRollFormats(res.data.rollFormats);
          if (res.data.filmTypes) setFilmTypes(res.data.filmTypes);
        }
      } catch (error) {
        console.error('获取系统设置失败:', error);
      }

      setThemeModeState(settings.themeMode);
      setLanguageState(defaultLang);
      setOpenRegistration(regOpen);
      setLv2RollLimit(limit);
      setIsLoaded(true);
    };

    initSettings();
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
      isDarkMode,
      openRegistration,
      lv2RollLimit,
      rollFormats,
      filmTypes
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
