import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { MMKV } from '../utils/safe-storage';

const storage = new MMKV();
const THEME_KEY = 'user-theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useSystemColorScheme();
  // NOTE: 通过 NativeWind 的 useColorScheme 控制 dark: 变体的实际生效，
  // 仅更新 React state 不会触发 NativeWind className 中 dark: 前缀的切换
  const { setColorScheme: setNativeWindScheme } = useNativeWindColorScheme();
  
  // NOTE: 优先读取 MMKV 中的持久化用户主题设置，默认跟随系统 ('system')
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (storage.getString(THEME_KEY) as ThemeMode) || 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = storage.getString(THEME_KEY) as ThemeMode;
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return systemScheme === 'dark';
  });

  const setThemeMode = (mode: ThemeMode) => {
    storage.set(THEME_KEY, mode);
    setThemeModeState(mode);
  };

  // NOTE: 同步更新 isDark 状态 + NativeWind 的 colorScheme，
  // 确保 Tailwind dark: 变体和 JS 侧的 isDark 判断一致
  useEffect(() => {
    // NOTE: systemScheme 可能返回 'unspecified'，需归一化为 'light' | 'dark'
    const resolvedSystem: 'light' | 'dark' = systemScheme === 'dark' ? 'dark' : 'light';
    const activeScheme: 'light' | 'dark' = themeMode === 'system' ? resolvedSystem : themeMode;
    setIsDark(activeScheme === 'dark');
    // NOTE: 关键调用 —— 通知 NativeWind 切换暗色/亮色模式，驱动所有 dark: className 变体生效
    setNativeWindScheme(activeScheme);
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// NOTE: 自定义 useTheme Hook 方便各拟物组件高频订阅主题状态
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
